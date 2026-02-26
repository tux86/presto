import { customAlphabet } from "nanoid";

/** 21-char alphanumeric ID */
export const createId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 21);
