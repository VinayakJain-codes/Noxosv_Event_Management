<?php

namespace HiEvents\Services\Domain\Enrollment;

use HiEvents\Repository\Interfaces\EventEnrollmentRepositoryInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ImportEventEnrollmentsService
{
    private const KNOWN_KEYS = [
        'enrollment_no',
        'first_name',
        'last_name',
        'full_name',
        'email',
        'class',
        'department',
    ];

    public function __construct(
        private readonly EventEnrollmentRepositoryInterface $enrollmentRepository,
    ) {}

    /**
     * @param int $eventId
     * @param UploadedFile $file
     * @param array<string, string|int> $mapping Custom mapping of target_field => source_column_header
     * @return array{total_rows: int, imported: int, skipped: int, errors: array}
     */
    public function import(int $eventId, UploadedFile $file, array $mapping = []): array
    {
        $filePath = $file->getRealPath();
        $content = file_get_contents($filePath);
        if ($content === false || trim($content) === '') {
            return ['total_rows' => 0, 'imported' => 0, 'skipped' => 0, 'errors' => [__('The uploaded file is empty.')]];
        }

        // Strip UTF-8 BOM if present
        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }

        // Detect delimiter
        $firstLine = strtok($content, "\r\n");
        $delimiter = ',';
        if ($firstLine !== false) {
            $commaCount = substr_count($firstLine, ',');
            $semiCount = substr_count($firstLine, ';');
            $tabCount = substr_count($firstLine, "\t");
            if ($tabCount > $commaCount && $tabCount > $semiCount) {
                $delimiter = "\t";
            } elseif ($semiCount > $commaCount) {
                $delimiter = ';';
            }
        }

        $lines = str_getcsv($content, "\n");
        if (empty($lines)) {
            return ['total_rows' => 0, 'imported' => 0, 'skipped' => 0, 'errors' => [__('The CSV file is empty or has no content.')]];
        }

        $headerRow = str_getcsv(array_shift($lines), $delimiter);
        if (!$headerRow) {
            return ['total_rows' => 0, 'imported' => 0, 'skipped' => 0, 'errors' => [__('The header row could not be parsed.')]];
        }

        $rawHeaders = array_map(fn ($h) => trim($h), $headerRow);
        $headersLower = array_map(fn ($h) => strtolower($h), $rawHeaders);

        // If mapping is provided, build normalized column index map
        $columnIndexMap = [];
        if (!empty($mapping)) {
            foreach ($mapping as $targetField => $sourceColumn) {
                if (empty($sourceColumn)) {
                    continue;
                }
                $sourceColLower = strtolower(trim((string)$sourceColumn));
                $idx = array_search($sourceColLower, $headersLower, true);
                if ($idx !== false) {
                    $columnIndexMap[$targetField] = $idx;
                } elseif (is_numeric($sourceColumn) && isset($rawHeaders[(int)$sourceColumn])) {
                    $columnIndexMap[$targetField] = (int)$sourceColumn;
                }
            }
        } else {
            // Auto-detect mappings from header names
            foreach ($headersLower as $idx => $header) {
                $clean = preg_replace('/[^a-z0-9]/', '', $header);
                if (in_array($clean, ['enrollmentno', 'enrollmentnumber', 'enrollment', 'rollno', 'rollnumber', 'roll', 'registrationno', 'regno', 'id', 'studentid', 'idnumber', 'userid', 'admissionno', 'admno', 'enrollmentid'], true)) {
                    $columnIndexMap['enrollment_no'] ??= $idx;
                } elseif (
                    in_array($clean, ['fullname', 'name', 'studentname', 'studentsname', 'attendee', 'attendeename', 'candidatename', 'candidatesname', 'nameofstudent', 'student'], true)
                    || (str_contains($clean, 'name') && !str_contains($clean, 'father') && !str_contains($clean, 'mother') && !str_contains($clean, 'parent') && !str_contains($clean, 'guardian') && !str_contains($clean, 'college') && !str_contains($clean, 'school'))
                ) {
                    $columnIndexMap['full_name'] ??= $idx;
                } elseif (in_array($clean, ['firstname', 'fname', 'first'], true)) {
                    $columnIndexMap['first_name'] ??= $idx;
                } elseif (in_array($clean, ['lastname', 'lname', 'last', 'surname'], true)) {
                    $columnIndexMap['last_name'] ??= $idx;
                } elseif (in_array($clean, ['email', 'emailaddress', 'mail'], true)) {
                    $columnIndexMap['email'] ??= $idx;
                } elseif (in_array($clean, ['class', 'year', 'grade', 'standard', 'semester', 'sem', 'batch', 'division', 'section'], true)) {
                    $columnIndexMap['class'] ??= $idx;
                } elseif (in_array($clean, ['department', 'dept', 'branch', 'stream', 'course', 'major', 'program'], true)) {
                    $columnIndexMap['department'] ??= $idx;
                }
            }
        }

        if (!isset($columnIndexMap['enrollment_no'])) {
            return [
                'total_rows' => 0,
                'imported' => 0,
                'skipped' => 0,
                'errors' => [__('Could not determine the Enrollment / ID column. Please map the enrollment number column.')],
            ];
        }

        $rows = [];
        $errors = [];
        $rowNumber = 1;
        $skipped = 0;

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $rowNumber++;

            $row = str_getcsv($line, $delimiter);
            if (empty($row) || (count($row) === 1 && $row[0] === null)) {
                continue;
            }

            $enrollmentNo = trim($row[$columnIndexMap['enrollment_no']] ?? '');
            if ($enrollmentNo === '') {
                $skipped++;
                $errors[] = __('Row :row has no enrollment number.', ['row' => $rowNumber]);
                continue;
            }

            // Name resolution
            $firstName = '';
            $lastName = '';

            if (isset($columnIndexMap['full_name'])) {
                $fullName = trim($row[$columnIndexMap['full_name']] ?? '');
                if ($fullName !== '') {
                    $parts = preg_split('/\s+/', $fullName, 2);
                    $firstName = $parts[0] ?? '';
                    $lastName = $parts[1] ?? '';
                }
            }

            if (isset($columnIndexMap['first_name'])) {
                $fn = trim($row[$columnIndexMap['first_name']] ?? '');
                if ($fn !== '') {
                    $firstName = $fn;
                }
            }

            if (isset($columnIndexMap['last_name'])) {
                $ln = trim($row[$columnIndexMap['last_name']] ?? '');
                if ($ln !== '') {
                    $lastName = $ln;
                }
            }

            // If still no name, default to enrollment number or fallback
            if ($firstName === '' && $lastName === '') {
                $firstName = $enrollmentNo;
                $lastName = '';
            }

            $email = isset($columnIndexMap['email']) ? (trim($row[$columnIndexMap['email']] ?? '') ?: null) : null;
            $class = isset($columnIndexMap['class']) ? (trim($row[$columnIndexMap['class']] ?? '') ?: null) : null;
            $department = isset($columnIndexMap['department']) ? (trim($row[$columnIndexMap['department']] ?? '') ?: null) : null;

            // Extra data from all other columns
            $extraData = [];
            $mappedIndices = array_values($columnIndexMap);
            foreach ($row as $cIdx => $val) {
                if (!in_array($cIdx, $mappedIndices, true) && isset($rawHeaders[$cIdx])) {
                    $valTrim = trim((string)$val);
                    if ($valTrim !== '') {
                        $extraData[$rawHeaders[$cIdx]] = $valTrim;
                    }
                }
            }

            // Index by enrollment_no to ensure no duplicates in the same upsert batch
            if (isset($rows[$enrollmentNo])) {
                $skipped++;
            }

            $rows[$enrollmentNo] = [
                'event_id' => $eventId,
                'enrollment_no' => $enrollmentNo,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'class' => $class,
                'department' => $department,
                'extra_data' => !empty($extraData) ? json_encode($extraData, JSON_UNESCAPED_UNICODE) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        $uniqueRows = array_values($rows);

        if (empty($uniqueRows)) {
            return ['total_rows' => $rowNumber - 1, 'imported' => 0, 'skipped' => $skipped, 'errors' => $errors];
        }

        DB::transaction(function () use ($uniqueRows) {
            foreach (array_chunk($uniqueRows, 500) as $chunk) {
                DB::table('event_enrollments')->upsert(
                    $chunk,
                    ['event_id', 'enrollment_no'],
                    ['first_name', 'last_name', 'email', 'class', 'department', 'extra_data', 'updated_at'],
                );
            }
        });

        return [
            'total_rows' => $rowNumber - 1,
            'imported' => count($uniqueRows),
            'skipped' => $skipped,
            'errors' => array_slice($errors, 0, 10), // return up to 10 sample errors if any
        ];
    }
}

