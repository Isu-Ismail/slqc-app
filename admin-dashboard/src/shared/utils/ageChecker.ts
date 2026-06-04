// src/shared/utils/ageChecker.ts

export interface AgeCriteriaConfig {
    '5_juz': { min: number; max: number };
    '15_juz': { min: number; max: number };
    '30_juz': { min: number; max: number };
}

export interface AgeEligibilityResult {
    eligible: boolean;
    message: string;
}

export function checkAgeEligibility(
    dobString: string,
    eventDateString: string,
    criteria: AgeCriteriaConfig,
    bufferMonths: number
): Record<'5_juz' | '15_juz' | '30_juz', AgeEligibilityResult> {
    const results: Record<'5_juz' | '15_juz' | '30_juz', AgeEligibilityResult> = {
        '5_juz': { eligible: true, message: '' },
        '15_juz': { eligible: true, message: '' },
        '30_juz': { eligible: true, message: '' }
    };
    if (!dobString || !eventDateString) return results;

    const dob = new Date(dobString);
    const eventDate = new Date(eventDateString);
    if (isNaN(dob.getTime()) || isNaN(eventDate.getTime())) return results;

    // Calculate age in months precisely
    let yearsDiff = eventDate.getFullYear() - dob.getFullYear();
    let monthsDiff = eventDate.getMonth() - dob.getMonth();
    let daysDiff = eventDate.getDate() - dob.getDate();
    
    // total fractional months
    const totalMonths = yearsDiff * 12 + monthsDiff + (daysDiff / 30.4375); // average days in a month

    const categories = ['5_juz', '15_juz', '30_juz'] as const;
    categories.forEach(cat => {
        const rule = criteria[cat];
        if (!rule) return;
        
        // Convert years to months and apply buffer
        const maxMonthsAllowed = rule.max * 12 + bufferMonths;
        const minMonthsRequired = rule.min * 12 - bufferMonths;
        
        const isOverAge = totalMonths > maxMonthsAllowed;
        const isUnderAge = totalMonths < minMonthsRequired;

        if (isOverAge) {
            results[cat] = {
                eligible: false,
                message: `Over age limit (${rule.max} yrs)`
            };
        } else if (isUnderAge) {
            results[cat] = {
                eligible: false,
                message: `Under age limit (${rule.min} yrs)`
            };
        } else {
            results[cat] = {
                eligible: true,
                message: ''
            };
        }
    });

    return results;
}
