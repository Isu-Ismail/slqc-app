// src/shared/utils/categoryValidator.ts
import { checkAgeEligibility } from './ageChecker';

interface ValidationResult {
    allowed: boolean;
    message: string;
}

export function validateCategorySelection(
    category: string,
    dob: string,
    eventDate: string,
    ageCriteria: any,
    ageBuffer: number
): ValidationResult {
    if (!dob || !eventDate) {
        return { allowed: true, message: '' };
    }

    const ageEligibilityMap = checkAgeEligibility(
        dob,
        eventDate,
        ageCriteria || {
            '5_juz': { min: 0, max: 15 },
            '15_juz': { min: 0, max: 19 },
            '30_juz': { min: 0, max: 25 }
        },
        ageBuffer
    );

    const currentAgeEligibility = ageEligibilityMap[category as '5_juz' | '15_juz' | '30_juz'];
    if (currentAgeEligibility && !currentAgeEligibility.eligible) {
        return {
            allowed: false,
            message: `Age restriction: ${currentAgeEligibility.message}`
        };
    }

    return { allowed: true, message: '' };
}
