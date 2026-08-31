// Type definitions for Supabase Edge Functions running on Deno

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    has(key: string): boolean;
    toObject(): Record<string, string>;
  }

  export const env: Env;

  export function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;
  export function serve(
    options: {
      port?: number;
      hostname?: string;
      onListen?: (params: { hostname: string; port: number }) => void;
      onError?: (error: unknown) => Response | Promise<Response>;
    },
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}

declare module "npm:@clerk/backend" {
  export interface ClerkClientOptions {
    secretKey?: string;
    publishableKey?: string;
    jwtKey?: string;
    apiUrl?: string;
    apiVersion?: string;
    userAgent?: string;
    [key: string]: unknown;
  }

  export interface ClerkUser {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    emailAddresses: Array<{
      id: string;
      emailAddress: string;
    }>;
    publicMetadata: Record<string, unknown>;
    privateMetadata: Record<string, unknown>;
    unsafeMetadata: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
    [key: string]: unknown;
  }

  export interface ClerkUserCreateParams {
    emailAddress?: string[];
    phoneNumber?: string[];
    username?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    skipPasswordRequirement?: boolean;
    skipPasswordChecks?: boolean;
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
    unsafeMetadata?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface ClerkUserUpdateMetadataParams {
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
    unsafeMetadata?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface ClerkClient {
    users: {
      getUser(userId: string): Promise<ClerkUser>;
      createUser(params: ClerkUserCreateParams): Promise<ClerkUser>;
      updateUserMetadata(userId: string, params: ClerkUserUpdateMetadataParams): Promise<ClerkUser>;
      deleteUser(userId: string): Promise<ClerkUser>;
      [key: string]: any;
    };
    authenticateRequest(request: Request, options?: any): Promise<any>;
    verifyToken(token: string, options?: any): Promise<any>;
    [key: string]: any;
  }

  export function createClerkClient(options: ClerkClientOptions): ClerkClient;
}

declare module "npm:@supabase/supabase-js" {
  export * from "@supabase/supabase-js";
}
