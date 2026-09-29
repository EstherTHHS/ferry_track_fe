import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export type ApiErrorPayload = {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = payload.status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

instance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (
    error: AxiosError<{ message?: string; code?: string; details?: unknown }>,
  ) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;

    return Promise.reject(
      new ApiError({
        message:
          data?.message ?? error.message ?? "Unexpected error contacting the API.",
        status,
        code: data?.code,
        details: data?.details,
      }),
    );
  },
);

export type ApiRequestConfig<D = unknown> = AxiosRequestConfig<D>;

/** Wraps an axios instance in a thin, data-returning client surface. */
const makeClient = (client: AxiosInstance) => ({
  get: <T, D = unknown>(url: string, config?: ApiRequestConfig<D>) =>
    client.get<T, AxiosResponse<T>, D>(url, config).then((r) => r.data),
  post: <T, D = unknown>(url: string, data?: D, config?: ApiRequestConfig<D>) =>
    client
      .post<T, AxiosResponse<T>, D>(url, data, config)
      .then((r) => r.data),
  put: <T, D = unknown>(url: string, data?: D, config?: ApiRequestConfig<D>) =>
    client.put<T, AxiosResponse<T>, D>(url, data, config).then((r) => r.data),
  patch: <T, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig<D>,
  ) =>
    client
      .patch<T, AxiosResponse<T>, D>(url, data, config)
      .then((r) => r.data),
  delete: <T, D = unknown>(url: string, config?: ApiRequestConfig<D>) =>
    client.delete<T, AxiosResponse<T>, D>(url, config).then((r) => r.data),
});

export const apiClient = makeClient(instance);

export default apiClient;
