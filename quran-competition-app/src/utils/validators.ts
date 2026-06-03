// src/utils/validators.ts

// 1. Verhoeff Algorithm Tables for Aadhaar Verification
const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];
export const validators = {
    // Verifies if the Aadhaar is mathematically valid
    isValidAadhaar: (aadhaar: string): boolean => {
        if (!/^[2-9]{1}\d{11}$/.test(aadhaar)) return false; // Must be 12 digits, cannot start with 0 or 1

        let c = 0;
        const array = aadhaar.split('').map(Number).reverse();
        for (let i = 0; i < array.length; i++) {
            c = d[c][p[i % 8][array[i]]];
        }
        return c === 0;
    },

    // Standard Indian 10-digit mobile number
    isValidMobile: (mobile: string): boolean => {
        return /^[6-9]\d{9}$/.test(mobile);
    },

    // Basic strict email validation
    isValidEmail: (email: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
};