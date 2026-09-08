<?php

namespace HiEvents\Services\Infrastructure\Razorpay;

use Exception;
use Illuminate\Config\Repository as ConfigRepository;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Psr\Log\LoggerInterface;

class RazorpayClient
{
    private const BASE_URL = 'https://api.razorpay.com/v1';

    public function __construct(
        private readonly ConfigRepository $config,
        private readonly LoggerInterface $logger,
    ) {}

    public function getKeyId(): ?string
    {
        return $this->config->get('services.razorpay.key_id');
    }

    private function getKeySecret(): ?string
    {
        return $this->config->get('services.razorpay.key_secret');
    }

    private function getWebhookSecret(): ?string
    {
        return $this->config->get('services.razorpay.webhook_secret') ?: $this->getKeySecret();
    }

    /**
     * @throws Exception
     */
    public function createOrder(array $params): array
    {
        $response = $this->httpClient()
            ->post('/orders', $params);

        if ($response->failed()) {
            $this->logger->error('Razorpay order creation failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'params' => $params,
            ]);

            $message = $response->json('error.description') ?? __('Failed to initiate payment session with Razorpay.');
            throw new Exception($message);
        }

        return $response->json();
    }

    /**
     * @throws Exception
     */
    public function fetchOrder(string $orderId): array
    {
        $response = $this->httpClient()
            ->get("/orders/{$orderId}");

        if ($response->failed()) {
            $this->logger->error('Razorpay order retrieval failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'order_id' => $orderId,
            ]);

            $message = $response->json('error.description') ?? __('Failed to retrieve order from Razorpay.');
            throw new Exception($message);
        }

        return $response->json();
    }

    /**
     * @throws Exception
     */
    public function fetchPayment(string $paymentId): array
    {
        $response = $this->httpClient()
            ->get("/payments/{$paymentId}");

        if ($response->failed()) {
            $this->logger->error('Razorpay payment retrieval failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'payment_id' => $paymentId,
            ]);

            $message = $response->json('error.description') ?? __('Failed to retrieve payment from Razorpay.');
            throw new Exception($message);
        }

        return $response->json();
    }

    /**
     * @throws Exception
     */
    public function createRefund(string $paymentId, array $refundData): array
    {
        $response = $this->httpClient()
            ->post("/payments/{$paymentId}/refund", $refundData);

        if ($response->failed()) {
            $this->logger->error('Razorpay refund creation failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'payment_id' => $paymentId,
            ]);

            $message = $response->json('error.description') ?? __('Failed to process refund with Razorpay.');
            throw new Exception($message);
        }

        return $response->json();
    }

    public function verifyPaymentSignature(string $orderId, string $paymentId, string $signature): bool
    {
        $keySecret = $this->getKeySecret();
        if (empty($keySecret)) {
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $orderId . '|' . $paymentId, $keySecret);

        return hash_equals($expectedSignature, $signature);
    }

    public function verifyWebhookSignature(string $rawBody, string $signature): bool
    {
        $secret = $this->getWebhookSecret();
        if (empty($secret) || empty($signature)) {
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $rawBody, $secret);

        return hash_equals($expectedSignature, $signature);
    }

    private function httpClient(): PendingRequest
    {
        return Http::baseUrl(self::BASE_URL)
            ->timeout(20)
            ->withBasicAuth($this->getKeyId() ?? '', $this->getKeySecret() ?? '')
            ->withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ]);
    }
}
