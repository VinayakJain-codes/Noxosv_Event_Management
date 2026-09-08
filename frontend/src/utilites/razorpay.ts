export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name?: string;
    description?: string;
    order_id: string;
    handler: (response: RazorpayPaymentResponse) => void;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    theme?: {
        color?: string;
    };
    modal?: {
        ondismiss?: () => void;
    };
}

export interface RazorpayPaymentResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

export interface RazorpayInstance {
    open: () => void;
    close: () => void;
    on: (event: string, callback: (...args: any[]) => void) => void;
}

declare global {
    interface Window {
        Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
    }
}

let razorpayPromise: Promise<typeof window.Razorpay | undefined> | null = null;

export const loadRazorpay = (): Promise<typeof window.Razorpay | undefined> => {
    if (typeof window === 'undefined') {
        return Promise.resolve(undefined);
    }

    if (window.Razorpay) {
        return Promise.resolve(window.Razorpay);
    }

    if (!razorpayPromise) {
        razorpayPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => {
                if (window.Razorpay) {
                    resolve(window.Razorpay);
                } else {
                    reject(new Error('Razorpay SDK failed to initialize'));
                }
            };
            script.onerror = () => {
                reject(new Error('Failed to load Razorpay SDK'));
            };
            document.head.appendChild(script);
        });
    }

    return razorpayPromise;
};
