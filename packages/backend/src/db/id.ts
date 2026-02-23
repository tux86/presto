import { customAlphabet } from "nanoid";

export const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const ID_LENGTH = 21;

/** 21-char alphanumeric ID */
export const createId = customAlphabet(ALPHABET, ID_LENGTH);
