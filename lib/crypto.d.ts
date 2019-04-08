export interface CryptoOptions {
    cipher: string;
    key: string;
    iv: string;
}
export declare function CryptoMethod(action: string, filename: string, options?: CryptoOptions): any;
