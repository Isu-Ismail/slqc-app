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

export interface JuzOption {
    code: string;
    label: string;
    category: string;
    fromJuz: number;
    toJuz: number;
    text: string;
}

export const JUZ_OPTIONS: JuzOption[] = [
    { code: '0030', label: 'Juz 1-30: Full Quran (آلم to ٱلنَّاس)', category: '30_juz', fromJuz: 1, toJuz: 30, text: 'Juz 1 to 30' },
    { code: '0115', label: 'Juz 1-15: Alif Lam Meem (آلم) to Subhanalladhee (سُبْحَانَ ٱلَّذِى)', category: '15_juz', fromJuz: 1, toJuz: 15, text: 'Juz 1 to 15' },
    { code: '1530', label: 'Juz 16-30: Qala Alam (قَالَ أَلَمْ) to Amma (عَمَّ)', category: '15_juz', fromJuz: 16, toJuz: 30, text: 'Juz 16 to 30' },
    { code: '01102630', label: 'Juz 1-10 & 26-30: Alif Lam Meem (آلم) to Wa\'lamu (وَٱعْلَمُواْ) + Ha Meem (حم) to Amma (عَمَّ)', category: '15_juz', fromJuz: 1, toJuz: 30, text: 'Juz 1–10 & 26–30' },
    { code: '2630', label: 'Juz 26-30: Ha Meem (حم) to Amma (عَمَّ)', category: '5_juz', fromJuz: 26, toJuz: 30, text: 'Juz 26 to 30' },
    { code: '0105', label: 'Juz 1-5: Alif Lam Meem (آلم) to Wal Mohsanat (وَٱلْمُحْصَنَاتُ)', category: '5_juz', fromJuz: 1, toJuz: 5, text: 'Juz 1 to 5' }
];

export const getJuzLabel = (code: string): string => {
    const opt = JUZ_OPTIONS.find(o => o.code === code);
    return opt ? opt.label : code;
};

export const getJuzCodesForCategory = (category: string): JuzOption[] => {
    return JUZ_OPTIONS.filter(o => o.category === category);
};

export const getCategoryLabel = (key: string): string => {
    const cat = CATEGORIES_CONFIG.find(c => c.key === key);
    return cat ? cat.label : key;
};

export const getJuzOptionsForCategory = (key: string): string[] => {
    const cat = CATEGORIES_CONFIG.find(c => c.key === key);
    return cat && cat.juzOptions ? cat.juzOptions : [];
};
