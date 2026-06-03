import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { pb } from '../../api/db';
import { approvalsApi, type AllocatedItem } from '../../api/approvals';
import { adminTrackApi } from '../../api/track';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../api/track';
import styles from './Approvals.module.css';

export default function ApprovalReviewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const appType = (searchParams.get('type') as 'individual' | 'institution') || 'individual';

    const [application, setApplication] = useState<AllocatedItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);

    // Modal states
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const actionTakenRef = useRef(false);


    useEffect(() => {
        // Safe guard: If there is no ID, stop loading instantly
        if (!id) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        const collectionName = appType === 'individual' ? 'participants_application' : 'institutions';

        const checkAndAcquireLock = async () => {
            try {
                const existingLock = await approvalsApi.getLock(id);
                if (existingLock) {
                    if (existingLock.locked_by !== pb.authStore.record?.id) {
                        alert(`Another coordinator (${existingLock.locked_by_name || 'Someone'}) is currently reviewing this application.`);
                        navigate(`/approvals?type=${appType}`);
                        return false;
                    }
                } else {
                    // Try to create the lock
                    await approvalsApi.createLock(
                        id,
                        appType,
                        pb.authStore.record!.id,
                        pb.authStore.record!.email || "Coordinator"
                    );
                }
                return true;
            } catch (e) {
                alert("This application is locked by someone else or could not be locked.");
                navigate(`/approvals?type=${appType}`);
                return false;
            }
        };

        // 2. Fetch the Application
        const fetchApp = async () => {
            setLoading(true);
            try {
                // Use a unique requestKey so this fetch doesn't get cancelled by the updates
                const data = await pb.collection(collectionName).getOne<AllocatedItem>(id, {
                    expand: 'institution_ref',
                    requestKey: `fetch_${id}`
                });

                if (isMounted) {
                    setApplication(data);
                }
            } catch (err) {
                console.error("Error fetching app details:", err);
            } finally {
                // Moving this to 'finally' guarantees it clears the loading screen no matter what!
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        const init = async () => {
            const lockOk = await checkAndAcquireLock();
            if (lockOk && isMounted) {
                await fetchApp();
            }
        };
        init();

        // 3. Cleanup logic when leaving the page
        return () => {
            isMounted = false;
            // Only unlock if the user hits Back, Cancel, or closes the tab without acting
            if (!actionTakenRef.current && id) {
                approvalsApi.releaseLock(id).catch(() => { });
            }
        };
    }, [id, appType, navigate]);

    const submitApprove = async () => {
        if (!application) return;

        setProcessing(true);
        actionTakenRef.current = true;

        try {

            await adminTrackApi.updateStatusAndLock(
                application.id,
                appType,
                'approved',
                true,
            );
            await approvalsApi.releaseLock(
                application.id
            );

            approvalsApi.removeApplicationFromCache(
                application.id
            );



            navigate(
                `/approvals?type=${appType}`
            );

        } catch (e) {

            console.error(e);

            setProcessing(false);
            actionTakenRef.current = false;

            alert(
                "Failed to approve application."
            );
        }
    };

    const submitReject = async () => {
        if (!application) return;

        if (!rejectReason.trim()) {
            alert(
                "Please enter a rejection reason."
            );
            return;
        }

        setProcessing(true);
        actionTakenRef.current = true;

        try {

            await adminTrackApi.updateStatusAndLock(
                application.id,
                appType,
                'rejected',
                true,
                rejectReason.trim()
            );
            await approvalsApi.releaseLock(
                application.id
            );

            approvalsApi.removeApplicationFromCache(
                application.id
            );



            navigate(
                `/approvals?type=${appType}`
            );

        } catch (e) {

            console.error(e);

            setProcessing(false);
            actionTakenRef.current = false;

            alert(
                "Failed to reject application."
            );
        }
    };
    if (loading) {
        return (
            <div className={styles.loading}>
                Loading application details...
            </div>
        );
    }

    if (!application) {
        return (
            <div className={styles.pageContainer}>
                <h2>Application Not Found</h2>

                <button
                    onClick={() =>
                        navigate(
                            `/approvals?type=${appType}`
                        )
                    }
                    className={styles.btnSecondary}
                >
                    Go Back
                </button>
            </div>
        );
    }

    const isIndividual = appType === 'individual';
    const indivApp =
        application as ParticipantsApplicationResponse;
    const instApp =
        application as InstitutionsResponse;



    const aadhaarUrl = isIndividual && indivApp.aadhaar_front ? pb.files.getURL(application, indivApp.aadhaar_front) : '';
    const photoUrl = isIndividual && indivApp.candidate_photo ? pb.files.getURL(application, indivApp.candidate_photo) : '';
    const instData = (indivApp as any).expand?.institution_ref;

    return (
        <div className={styles.reviewPageWrapper}>
            <div className={styles.splitLayout}>
                {/* Left Side: Details */}
                <div className={styles.detailsPanel}>
                    <div style={{ marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                        <h3 className={styles.panelTitle} style={{ margin: 0, border: 'none', padding: 0 }}>Application ID: {application.id}</h3>
                    </div>

                    <div className={styles.detailsGrid}>
                        {isIndividual ? (
                            <>
                                <div className={styles.detailGroup}>
                                    <label>Full Name</label>
                                    <div>{indivApp.full_name}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>Date of Birth</label>
                                    <div>{indivApp.dob ? new Date(indivApp.dob).toLocaleDateString() : 'N/A'}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>Category</label>
                                    <div>{indivApp.category.replace('_', ' ')}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>Gender</label>
                                    <div style={{ textTransform: 'capitalize' }}>{indivApp.gender}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>Aadhaar Number</label>
                                    <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>{indivApp.aadhaar_number || 'N/A'}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>WhatsApp / Phone</label>
                                    <div>{indivApp.whatsapp_number}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>Guardian Name</label>
                                    <div>{indivApp.guardian_name}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>Guardian Phone</label>
                                    <div>{indivApp.guardian_phone}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>Requires Accommodation?</label>
                                    <div>{indivApp.requires_accommodation ? 'Yes' : 'No'}</div>
                                </div>

                                {instData && (
                                    <>
                                        <div className={styles.detailGroup} style={{ gridColumn: '1 / -1', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                                            <h4 style={{ fontSize: '13px', color: '#0f766e', marginBottom: '12px', textTransform: 'uppercase' }}>Associated Institution Details</h4>
                                        </div>
                                        <div className={styles.detailGroup}>
                                            <label>Institution Name</label>
                                            <div>{instData.name}</div>
                                        </div>
                                        <div className={styles.detailGroup}>
                                            <label>Institution ID</label>
                                            <div>{instData.institution_id || 'N/A'}</div>
                                        </div>
                                        <div className={styles.detailGroup} style={{ gridColumn: '1 / -1' }}>
                                            <label>Institution Address</label>
                                            <div>{instData.address || 'N/A'}</div>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <div className={styles.detailGroup}>
                                    <label>Institution Name</label>
                                    <div>{instApp.name}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>Contact Person</label>
                                    <div>{instApp.contact_person}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>Phone Number</label>
                                    <div>{instApp.phone_number || 'N/A'}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>WhatsApp Number</label>
                                    <div>{instApp.whatsapp_number || 'N/A'}</div>
                                </div>
                                <div className={styles.detailGroup}>
                                    <label>Email Address</label>
                                    <div>{instApp.email || 'N/A'}</div>
                                </div>
                                <div className={styles.detailGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label>Address</label>
                                    <div>{instApp.address || 'N/A'}</div>
                                </div>
                                <div className={styles.detailGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label>Location Map</label>
                                    <div>
                                        {instApp.instituition_location ? (
                                            <a href={instApp.instituition_location} target="_blank" rel="noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none' }}>
                                                View on Google Maps ↗
                                            </a>
                                        ) : 'N/A'}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className={styles.detailGroup} style={{ marginTop: '24px' }}>
                        <label>Current Status</label>
                        <div className={`${styles.statusBadge} ${styles[application.status]}`} style={{ display: 'inline-block' }}>
                            {application.status.toUpperCase()}
                        </div>
                    </div>
                    {application.rejection_reason && (
                        <div className={styles.detailGroup} style={{ color: '#dc2626', marginTop: '16px' }}>
                            <label>Rejection Reason</label>
                            <div>{application.rejection_reason}</div>
                        </div>
                    )}

                    <div className={styles.inlineActionBar}>
                        <button
                            className={styles.btnApproveNormal}
                            onClick={() => setIsApproveModalOpen(true)}
                            disabled={processing || application.status === 'approved'}
                        >
                            {processing ? 'Processing...' : 'Approve & Lock'}
                        </button>
                        <button
                            className={styles.btnRejectNormal}
                            onClick={() => setIsRejectModalOpen(true)}
                            disabled={processing || application.status === 'rejected'}
                        >
                            Reject
                        </button>
                        <button
                            className={styles.btnCancelNormal}
                            onClick={async () => {

                                if (id) {
                                    await approvalsApi.releaseLock(id);
                                }

                                navigate(
                                    `/approvals?type=${appType}`
                                );
                            }}
                            disabled={processing}
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Right Side: Documents */}
                <div className={styles.documentsPanel}>
                    {isIndividual ? (
                        <div className={styles.docRow}>
                            <div className={styles.docBox} style={{ padding: '8px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Aadhaar Front</h4>
                                {aadhaarUrl ? (
                                    <div style={{ cursor: 'pointer' }} onClick={() => setFullscreenImg(aadhaarUrl)}>
                                        <img src={aadhaarUrl} alt="Aadhaar Document" className={styles.previewImg} style={{ maxHeight: '600px', width: '100%', objectFit: 'contain' }} />
                                    </div>
                                ) : (
                                    <div className={styles.noDoc}>No Aadhaar Provided</div>
                                )}
                            </div>
                            <div className={styles.docBox} style={{ padding: '8px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Passport Photo</h4>
                                {photoUrl ? (
                                    <div style={{ cursor: 'pointer' }} onClick={() => setFullscreenImg(photoUrl)}>
                                        <img src={photoUrl} alt="Candidate" className={styles.previewImg} style={{ maxHeight: '260px', width: '100%', objectFit: 'contain' }} />
                                    </div>
                                ) : (
                                    <div className={styles.noDoc}>No Photo Provided</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.docRow}>
                            <div className={styles.docBox} style={{ padding: '8px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Building Proof</h4>
                                {instApp.instituition_building_proof ? (
                                    <div style={{ cursor: 'pointer' }} onClick={() => setFullscreenImg(pb.files.getURL(application, instApp.instituition_building_proof!))}>
                                        <img src={pb.files.getURL(application, instApp.instituition_building_proof)} alt="Building Proof" className={styles.previewImg} style={{ maxHeight: '600px', width: '100%', objectFit: 'contain' }} />
                                    </div>
                                ) : (
                                    <div className={styles.noDoc}>No Building Proof Provided</div>
                                )}
                            </div>
                            <div className={styles.docBox} style={{ padding: '8px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Registration Document</h4>
                                {instApp.document ? (
                                    <div style={{ cursor: 'pointer' }} onClick={() => setFullscreenImg(pb.files.getURL(application, instApp.document))}>
                                        <img src={pb.files.getURL(application, instApp.document)} alt="Document" className={styles.previewImg} style={{ maxHeight: '260px', width: '100%', objectFit: 'contain' }} />
                                    </div>
                                ) : (
                                    <div className={styles.noDoc}>No Document Provided</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {fullscreenImg && (
                <div className={styles.imgModalOverlay} onClick={() => setFullscreenImg(null)}>
                    <img src={fullscreenImg} alt="Maximized view" />
                </div>
            )}

            {isRejectModalOpen && (
                <div className={styles.imgModalOverlay} onClick={() => setIsRejectModalOpen(false)}>
                    <div className={styles.customModal} onClick={e => e.stopPropagation()}>
                        <h3>Reject Application</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 12px 0' }}>Please provide a reason for rejecting this application.</p>
                        <input
                            autoFocus
                            type="text"
                            placeholder="e.g. Invalid document"
                            className={styles.rejectInput}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className={styles.modalActions}>
                            <button className={styles.btnCancelNormal} onClick={() => setIsRejectModalOpen(false)}>Cancel</button>
                            <button className={styles.btnRejectNormal} onClick={submitReject} disabled={processing}>
                                {processing ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isApproveModalOpen && (
                <div className={styles.imgModalOverlay} onClick={() => setIsApproveModalOpen(false)}>
                    <div className={styles.customModal} onClick={e => e.stopPropagation()}>
                        <h3>Confirm Approval</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>
                            Are you sure you want to approve this application? This action will generate a unique ID and notify the applicant.
                        </p>
                        <div className={styles.modalActions}>
                            <button className={styles.btnCancelNormal} onClick={() => setIsApproveModalOpen(false)}>Cancel</button>
                            <button className={styles.btnApproveNormal} onClick={submitApprove} disabled={processing}>
                                {processing ? 'Approving...' : 'Confirm Approve'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}