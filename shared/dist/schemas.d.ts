import { type TSchema } from '@sinclair/typebox';
export declare function SuccessSchema<T extends TSchema>(data: T): import("@sinclair/typebox").TObject<{
    success: import("@sinclair/typebox").TLiteral<true>;
    data: T;
    message: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export declare function ListSuccessSchema<T extends TSchema>(data: T): import("@sinclair/typebox").TObject<{
    success: import("@sinclair/typebox").TLiteral<true>;
    data: import("@sinclair/typebox").TArray<T>;
    totalCount: import("@sinclair/typebox").TNumber;
    message: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export declare const ErrorSchema: import("@sinclair/typebox").TObject<{
    success: import("@sinclair/typebox").TLiteral<false>;
    error: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    details: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
}>;
export declare const User: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    email: import("@sinclair/typebox").TString;
    fullName: import("@sinclair/typebox").TString;
    role: import("@sinclair/typebox").TInteger;
    status: import("@sinclair/typebox").TString;
}>;
export declare const LoginData: import("@sinclair/typebox").TObject<{
    user: import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        email: import("@sinclair/typebox").TString;
        fullName: import("@sinclair/typebox").TString;
        role: import("@sinclair/typebox").TInteger;
        status: import("@sinclair/typebox").TString;
    }>;
    accessToken: import("@sinclair/typebox").TString;
    refreshToken: import("@sinclair/typebox").TString;
    expiresIn: import("@sinclair/typebox").TString;
}>;
export declare const LoginResponse: import("@sinclair/typebox").TObject<{
    success: import("@sinclair/typebox").TLiteral<true>;
    data: import("@sinclair/typebox").TObject<{
        user: import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            email: import("@sinclair/typebox").TString;
            fullName: import("@sinclair/typebox").TString;
            role: import("@sinclair/typebox").TInteger;
            status: import("@sinclair/typebox").TString;
        }>;
        accessToken: import("@sinclair/typebox").TString;
        refreshToken: import("@sinclair/typebox").TString;
        expiresIn: import("@sinclair/typebox").TString;
    }>;
    message: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
//# sourceMappingURL=schemas.d.ts.map