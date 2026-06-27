// src/utils/categoryValidator.ts
import { checkAgeEligibility, checkCategoryAvailability } from './ageChecker';

interface ValidationResult {
    allowed: boolean;
    message: string;
}

export function validateCategorySelection(
    category: string,
    dob: string,
    eventDate: string,
    ageCriteria: any,
    ageBuffer: number,
    registrationType: 'individual' | 'institution',
    institutionApplications: any[] | undefined,
    limitConfig: any
): ValidationResult {
    // 1. Check Age Eligibility first
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
            message: `Age mismatch: ${currentAgeEligibility.message}`
        };
    }

    // 2. Check Institution Quota Limits if registering under an institution
    if (registrationType === 'institution') {
        const availability = checkCategoryAvailability(
            category,
            institutionApplications,
            limitConfig
        );
        if (!availability.available) {
            return {
                allowed: false,
                message: availability.message
            };
        }
    }

    return { allowed: true, message: '' };
}