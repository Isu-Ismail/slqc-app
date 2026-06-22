import { useState, useEffect } from 'react';
import { pb } from '../../api/db';
import { marksApi } from '../../api/marks';
import { Sliders, Zap, Award, Users } from 'lucide-react';
import styles from './MarkEntryPage.module.css';

import TemplateEditor from './TemplateEditor';
import StudentSidebar from './StudentSidebar';
import GradingWorkspace from './GradingWorkspace';

export default function MarkEntryPage() {
    const user = pb.authStore.model;

    // View toggling: 'grading' or 'template_editor'
    const [view, setView] = useState<'grading' | 'template_editor'>('grading');

    // --- GRADING VIEW STATES ---
    const [currentRound, setCurrentRound] = useState<'preliminary' | 'final'>('preliminary');
    const [selectedVenue, setSelectedVenue] = useState<string>('');
    const [venues, setVenues] = useState<any[]>([]);
    const [judges, setJudges] = useState<any[]>([]);
    const [templateColumns, setTemplateColumns] = useState<any>([]);

    const [pendingStudents, setPendingStudents] = useState<any[]>([]);
    const [completedStudents, setCompletedStudents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [scoringValues, setScoringValues] = useState<any>({}); // { [judgeId]: { [qId]: { [criterionKey]: val } } }

    const [loading, setLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [sidebarTab, setSidebarTab] = useState<'pending' | 'completed'>('pending');
    const [showStudentList, setShowStudentList] = useState<boolean>(false);

    // --- TEMPLATE EDITOR STATES ---
    const [editRound, setEditRound] = useState<'preliminary' | 'final'>('preliminary');
    const [editCategory, setEditCategory] = useState<'5_juz' | '15_juz' | '30_juz'>('5_juz');
    const [tplCriteria, setTplCriteria] = useState<any[]>([]);
    const [tplLoading, setTplLoading] = useState<boolean>(false);
    const [tplSaving, setTplSaving] = useState<boolean>(false);

    // Initial load: Fetch valid venues to populate selection drop-down matrix
    useEffect(() => {
        const loadInitialConfig = async () => {
            try {
                const records = await pb.collection('venue_detail').getFullList({
                    sort: 'name'
                });
                setVenues(records);
                if (records.length > 0) {
                    setSelectedVenue('all');
                }
            } catch (err) {
                console.error('Failed to load layout venues config:', err);
            }
        };
        loadInitialConfig();
    }, []);

    // Load students status for selected venue and round
    const loadVenueData = async () => {
        if (!selectedVenue) return;
        setLoading(true);
        try {
            const data = await marksApi.getStudentsStatus(selectedVenue, currentRound);
            setPendingStudents(data.pending || []);
            setCompletedStudents(data.completed || []);

            // Clear selected student if they are no longer in this context
            setSelectedStudent(null);
            setScoringValues({});
        } catch (err) {
            console.error('Failed to load student status dataset:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVenueData();
    }, [selectedVenue, currentRound]);

    // Realtime subscription setup
    useEffect(() => {
        const setupRealtime = async () => {
            try {
                await pb.collection('preliminary_marks').subscribe('*', () => {
                    loadVenueData();
                });
                await pb.collection('final_marks').subscribe('*', () => {
                    loadVenueData();
                });
                await pb.collection('participants_application').subscribe('*', () => {
                    loadVenueData();
                });
            } catch (err) {
                console.error("Realtime subscription setup failed:", err);
            }
        };

        setupRealtime();

        return () => {
            pb.collection('preliminary_marks').unsubscribe('*');
            pb.collection('final_marks').unsubscribe('*');
            pb.collection('participants_application').unsubscribe('*');
        };
    }, [selectedVenue, currentRound]);

    // Handle student selection
    // Handle student selection
    // Handle student selection
    const handleSelectStudent = async (student: any) => {
        // FIX: Clear the scoring values synchronously FIRST. 
        // This prevents the caching useEffect from running with the old student's marks.
        setScoringValues({});
        setSelectedStudent(student);
        setSearchQuery('');

        // Fetch student-specific template columns dynamically
        try {
            const data = await marksApi.getTemplate(currentRound, student.category);
            const cols = Array.isArray(data.columns)
                ? data.columns
                : (data.columns?.criteria || []);
            setTemplateColumns(cols);

            const currentJudges = student.judges || [];
            setJudges(currentJudges);

            // Parse current values: check localStorage cache first
            const cacheKey = `quran_scoring_cache_${student.participant_id}`;
            const cachedDataStr = localStorage.getItem(cacheKey);
            let parsedScoring: any = {};

            if (cachedDataStr) {
                try {
                    parsedScoring = JSON.parse(cachedDataStr);
                } catch (e) {
                    console.error("Failed to parse cached scoring data", e);
                }
            }

            if (Object.keys(parsedScoring).length === 0) {
                if (student.values && student.values.judges) {
                    parsedScoring = student.values.judges;
                } else {
                    // Pre-initialize empty values
                    currentJudges.forEach((j: any) => {
                        parsedScoring[j.id] = {};
                        cols.forEach((c: any) => {
                            parsedScoring[j.id][c.key] = {};
                            for (let i = 0; i < c.numQuestions; i++) {
                                parsedScoring[j.id][c.key][i] = '';
                            }
                        });
                    });
                }
            }
            setScoringValues(parsedScoring);
        } catch (err) {
            console.error('Failed to load student template / judges:', err);
        }
    };

    // Cache scoringValues to localStorage in real-time as values are modified
    useEffect(() => {
        if (!selectedStudent || !scoringValues || Object.keys(scoringValues).length === 0) return;

        let hasAnyMark = false;
        for (const judgeId in scoringValues) {
            for (const cKey in scoringValues[judgeId]) {
                for (const i in scoringValues[judgeId][cKey]) {
                    const val = scoringValues[judgeId][cKey][i];
                    if (val !== '' && val !== null && val !== undefined) {
                        hasAnyMark = true;
                        break;
                    }
                }
                if (hasAnyMark) break;
            }
            if (hasAnyMark) break;
        }

        const cacheKey = `quran_scoring_cache_${selectedStudent.participant_id}`;
        if (selectedStudent.is_frozen) {
            const savedStr = JSON.stringify(selectedStudent.values?.judges || {});
            const currentStr = JSON.stringify(scoringValues || {});
            if (savedStr !== currentStr) {
                localStorage.setItem(cacheKey, JSON.stringify(scoringValues));
            } else {
                localStorage.removeItem(cacheKey);
            }
        } else {
            if (hasAnyMark) {
                localStorage.setItem(cacheKey, JSON.stringify(scoringValues));
            } else {
                localStorage.removeItem(cacheKey);
            }
        }
    }, [scoringValues, selectedStudent]);

    // Calculate score totals for display
    const calculateTotals = (scoring: any) => {
        const judgeTotals: { [key: string]: number } = {};
        let grandTotal = 0;
        let judgeCount = 0;

        const criteriaList = Array.isArray(templateColumns)
            ? templateColumns
            : (templateColumns.criteria || []);

        judges.forEach(j => {
            let total = 0;
            criteriaList.forEach(c => {
                for (let i = 0; i < c.numQuestions; i++) {
                    const score = parseFloat(scoring[j.id]?.[c.key]?.[i]) || 0;
                    total += score;
                }
            });
            judgeTotals[j.id] = Number(total.toFixed(2));
            if (total > 0 || Object.keys(scoring[j.id] || {}).length > 0) {
                grandTotal += total;
                judgeCount++;
            }
        });

        const grandAverage = judgeCount > 0 ? Number((grandTotal / judgeCount).toFixed(2)) : 0;

        return {
            judgeTotals,
            grandTotal: Number(grandTotal.toFixed(2)),
            grandAverage
        };
    };

    const totals = calculateTotals(scoringValues);

    // Save and freeze student marks
    const handleSaveMarks = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        try {
            // Validate all inputs against their outOf limit
            let validationError = '';

            const criteriaList = Array.isArray(templateColumns)
                ? templateColumns
                : (templateColumns.criteria || []);

            judges.forEach(j => {
                criteriaList.forEach(c => {
                    for (let i = 0; i < c.numQuestions; i++) {
                        const valStr = scoringValues[j.id]?.[c.key]?.[i];
                        if (valStr !== undefined && valStr !== '') {
                            const val = parseFloat(valStr);
                            if (isNaN(val) || val < 0 || val > c.outOf) {
                                validationError = `Invalid score for Judge ${j.name}, ${c.label} (Col ${i + 1}). Value must be between 0 and ${c.outOf}.`;
                            }
                        }
                    }
                });
            });

            if (validationError) {
                alert(validationError);
                setIsSaving(false);
                return;
            }

            const payload = {
                judges: scoringValues,
                totals: totals
            };

            await marksApi.saveStudentMarks(currentRound, selectedStudent.participant_id, payload, true);

            // Clear cache upon successful save
            const cacheKey = `quran_scoring_cache_${selectedStudent.participant_id}`;
            localStorage.removeItem(cacheKey);

            // Reload data
            await loadVenueData();
            setSelectedStudent(null);
            setScoringValues({});
        } catch (err) {
            console.error('Failed to save student scores:', err);
            alert('Error saving marks: ' + err);
        } finally {
            setIsSaving(false);
        }
    };

    // --- TEMPLATE EDITOR LOGIC ---
    const loadTemplate = async () => {
        setTplLoading(true);
        setTplCriteria([]); // Clear previous template immediately to prevent stale caching/showing
        try {
            const data = await marksApi.getTemplate(editRound, editCategory);
            console.log("[client loadTemplate] round=" + editRound + ", category=" + editCategory + ", data=", data);
            setTplCriteria(data.columns?.criteria || []);
        } catch (err) {
            console.warn('[client loadTemplate] Template not found or failed to load:', err);
            setTplCriteria([]); // Ensure it remains empty
        } finally {
            setTplLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'template_editor') {
            loadTemplate();
        }
    }, [editRound, editCategory, view]);

    const handleSaveTemplate = async () => {
        setTplSaving(true);
        try {
            await marksApi.saveTemplate(editRound, editCategory, {
                criteria: tplCriteria
            });
            alert('Template saved successfully!');
        } catch (err) {
            console.error('Failed to save template:', err);
            alert('Failed to save template: ' + err);
        } finally {
            setTplSaving(false);
        }
    };

    const addCriterion = () => {
        const key = `c${Date.now()}`;
        const updated = [...tplCriteria, { key: key, label: 'New Aspect', numQuestions: 2, outOf: 10 }];
        setTplCriteria(updated);
    };

    const updateCriterion = (index: number, field: string, value: any) => {
        const updated = [...tplCriteria];
        updated[index] = { ...updated[index], [field]: value };
        setTplCriteria(updated);
    };

    const removeCriterion = (index: number) => {
        const updated = tplCriteria.filter((_, i) => i !== index);
        setTplCriteria(updated);
    };

    const handlePasteAspectNames = (startIndex: number, names: string[]) => {
        setTplCriteria(prev => {
            const updated = [...prev];
            names.forEach((name, offset) => {
                const targetIdx = startIndex + offset;
                if (targetIdx < updated.length) {
                    updated[targetIdx] = { ...updated[targetIdx], label: name };
                }
            });
            return updated;
        });
    };

    // Filter students for search bar auto-complete
    const allStudents = [...pendingStudents, ...completedStudents];
    const filteredSearchStudents = searchQuery.trim() !== ''
        ? allStudents.filter(s =>
            (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.register_id || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    if (user?.designation !== 'admin' && user?.designation !== 'coordinators') {
        return (
            <div className={styles.restricted}>
                <h2>Access Denied</h2>
                <p>Only Administrators and designated Evaluators can view or append tournament scores.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {view === 'template_editor' ? (
                <TemplateEditor
                    editRound={editRound}
                    setEditRound={setEditRound}
                    editCategory={editCategory}
                    setEditCategory={setEditCategory}
                    tplCriteria={tplCriteria}
                    tplLoading={tplLoading}
                    tplSaving={tplSaving}
                    onSave={handleSaveTemplate}
                    onBack={() => { setView('grading'); loadVenueData(); }}
                    addCriterion={addCriterion}
                    updateCriterion={updateCriterion}
                    removeCriterion={removeCriterion}
                    onPasteAspectNames={handlePasteAspectNames}
                />
            ) : (
                <div>
                    {/* Filter Segment (Venue & Round Selection) */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => { setCurrentRound('preliminary'); setSelectedStudent(null); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', border: '1px solid ' + (currentRound === 'preliminary' ? '#059669' : '#cbd5e1'), backgroundColor: currentRound === 'preliminary' ? '#f0fdf4' : '#ffffff', color: currentRound === 'preliminary' ? '#065f46' : '#475569', cursor: 'pointer', fontSize: '14px' }}
                            >
                                <Zap size={15} /> Preliminary Round
                            </button>
                            <button
                                type="button"
                                onClick={() => { setCurrentRound('final'); setSelectedStudent(null); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', border: '1px solid ' + (currentRound === 'final' ? '#059669' : '#cbd5e1'), backgroundColor: currentRound === 'final' ? '#f0fdf4' : '#ffffff', color: currentRound === 'final' ? '#065f46' : '#475569', cursor: 'pointer', fontSize: '14px' }}
                            >
                                <Award size={15} /> Final Round
                            </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                            <button
                                onClick={() => setShowStudentList(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#059669', border: 'none', borderRadius: '10px', color: '#ffffff', fontSize: '14px', cursor: 'pointer', fontWeight: '700', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)' }}
                            >
                                <Users size={16} /> Student List
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>Venue Location:</label>
                                <select
                                    value={selectedVenue}
                                    onChange={(e) => { setSelectedVenue(e.target.value); setSelectedStudent(null); }}
                                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', minWidth: '180px', outline: 'none', fontSize: '14px', fontWeight: '600' }}
                                >
                                    <option value="all">All Venues</option>
                                    {venues.map(v => (
                                        <option key={v.id} value={v.name}>{v.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={() => setView('template_editor')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', color: '#475569', fontWeight: '700', transition: 'all 0.2s' }}
                            >
                                <Sliders size={16} /> Configure Templates
                            </button>
                        </div>
                    </div>

                    <div style={{ width: '100%' }}>
                        <GradingWorkspace
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            filteredSearchStudents={filteredSearchStudents}
                            selectedStudent={selectedStudent}
                            onSelectStudent={handleSelectStudent}
                            selectedVenue={selectedVenue}
                            currentRound={currentRound}
                            templateColumns={templateColumns}
                            judges={judges}
                            scoringValues={scoringValues}
                            setScoringValues={setScoringValues}
                            totals={totals}
                            isSaving={isSaving}
                            onSaveMarks={handleSaveMarks}
                            user={user}
                            onBack={selectedStudent ? () => {
                                setSelectedStudent(null);
                                setScoringValues({});
                            } : undefined}
                        />
                    </div>

                    {/* Student List Modal Popup */}
                    {showStudentList && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                                {/* Modal Header */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Select Participant</h3>
                                    <button
                                        onClick={() => setShowStudentList(false)}
                                        style={{ border: 'none', backgroundColor: 'transparent', fontSize: '18px', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Modal Body (renders the StudentSidebar directly) */}
                                <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                                    <StudentSidebar
                                        sidebarTab={sidebarTab}
                                        setSidebarTab={setSidebarTab}
                                        pendingStudents={pendingStudents}
                                        completedStudents={completedStudents}
                                        selectedStudent={selectedStudent}
                                        onSelectStudent={(student) => {
                                            handleSelectStudent(student);
                                            setShowStudentList(false);
                                        }}
                                        loading={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}