export interface CategoryConfig {
    key: string;
    label: string;
    juzOptions?: string[];
    defaultJuz?: string;
}

export const CATEGORIES_CONFIG: CategoryConfig[] = [
    {
        key: '5_juz',
        label: '5 Juz Hifz',
        juzOptions: [
            'Juz 1-5: Alif Lam Meem (آلم) to Wal Mohsanat (وَٱلْمُحْصَنَاتُ)',
            'Juz 26-30: Ha Meem (حم) to Amma (عَمَّ)'
        ]
    },
    {
        key: '15_juz',
        label: '15 Juz Hifz',
        juzOptions: [
            'Juz 1-15: Alif Lam Meem (آلم) to Subhanalladhee (سُبْحَانَ ٱلَّذِى)',
            'Juz 16-30: Qala Alam (قَالَ أَلَمْ) to Amma (عَمَّ)',
            "Juz 1-10 & 26-30: Alif Lam Meem (آلم) to Wa'lamu (وَٱعْلَمُواْ) + Ha Meem (حم) to Amma (عَمَّ)"
        ]
    },
    {
        key: '30_juz',
        label: '30 Juz Hifz',
        defaultJuz: 'Juz 1-30: Full Quran (آلم to ٱلنَّاس)'
    }
];

export const getCategoryLabel = (key: string): string => {
    const cat = CATEGORIES_CONFIG.find(c => c.key === key);
    return cat ? cat.label : key;
};

export const getJuzOptionsForCategory = (key: string): string[] => {
    const cat = CATEGORIES_CONFIG.find(c => c.key === key);
    return cat && cat.juzOptions ? cat.juzOptions : [];
};

export interface FieldDefinition {
    key: string;
    label: string;
    type: 'text' | 'tel' | 'email' | 'date' | 'select' | 'textarea' | 'checkbox';
    required: boolean;
    placeholder?: string;
    validationType?: 'aadhaar' | 'phone' | 'email' | 'none';
    gridSpan?: 1 | 2;
    section?: 'candidate' | 'guardian';
    showInPrint?: boolean;
    showInDetails?: boolean;
    editable?: boolean;
    customFormRender?: boolean; // If true, handled separately in the form layout
    options?: { label: string; value: string }[];
}

export const FORM_FIELDS_CONFIG: FieldDefinition[] = [
    { key: 'full_name', label: 'Full Name', type: 'text', required: true, gridSpan: 2, section: 'candidate', showInPrint: true, showInDetails: true, editable: true },
    { key: 'father_name', label: 'Father Name', type: 'text', required: true, gridSpan: 1, section: 'candidate', showInPrint: true, showInDetails: true, editable: true },
    { key: 'father_number', label: 'Father Mobile', type: 'tel', required: false, validationType: 'phone', gridSpan: 1, section: 'candidate', showInPrint: true, showInDetails: true, editable: true },
    { key: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', required: true, validationType: 'aadhaar', gridSpan: 2, section: 'candidate', showInPrint: true, showInDetails: true, editable: true },
    { key: 'dob', label: 'Date of Birth', type: 'date', required: true, gridSpan: 1, section: 'candidate', showInPrint: true, showInDetails: true, editable: true },
    { key: 'gender', label: 'Gender', type: 'select', required: true, gridSpan: 1, section: 'candidate', showInPrint: true, showInDetails: true, editable: true, options: [{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }] },
    { key: 'category', label: 'Category', type: 'select', required: true, customFormRender: true, section: 'candidate', showInPrint: true, showInDetails: true, editable: true },
    { key: 'selected_juz', label: 'Selected Juz', type: 'select', required: true, customFormRender: true, section: 'candidate', showInPrint: true, showInDetails: true, editable: true },
    { key: 'whatsapp_number', label: 'WhatsApp Number', type: 'tel', required: true, validationType: 'phone', gridSpan: 1, section: 'candidate', showInPrint: true, showInDetails: true, editable: true },
    { key: 'email', label: 'Email Address', type: 'email', required: false, validationType: 'email', gridSpan: 1, section: 'candidate', showInPrint: true, showInDetails: true, editable: true },
    { key: 'guardian_name', label: 'Guardian Name', type: 'text', required: true, gridSpan: 1, section: 'guardian', showInPrint: true, showInDetails: true, editable: true },
    { key: 'guardian_phone', label: 'Guardian Phone', type: 'tel', required: true, validationType: 'phone', gridSpan: 1, section: 'guardian', showInPrint: true, showInDetails: true, editable: true },
    { key: 'requires_accommodation', label: 'Requires Accommodation', type: 'checkbox', required: false, customFormRender: true, section: 'guardian', showInPrint: true, showInDetails: true, editable: true }
];

