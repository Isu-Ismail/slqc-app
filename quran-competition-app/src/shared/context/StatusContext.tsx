import React, { createContext, useContext, useState, useEffect } from 'react';
import { metadataApi } from '../../api/routes/metadata.api';

type StatusType = 'waiting' | 'open' | 'closed';

interface StatusContextProps {
    metadata: Record<string, any>;
    participantStatus: StatusType;
    madrasaStatus: StatusType;
    checkingStatus: boolean;
}

const StatusContext = createContext<StatusContextProps | undefined>(undefined);

export const StatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [metadata, setMetadata] = useState<Record<string, any>>({});
    const [checkingStatus, setCheckingStatus] = useState(true);

    const getStatusFromValue = (val: any): StatusType => {
        let obj = val;
        if (typeof val === 'string') {
            try {
                obj = JSON.parse(val);
            } catch {}
        }
        return obj && obj.status ? obj.status : 'open';
    };

    const participantStatus = getStatusFromValue(metadata.participant_application_status);
    const madrasaStatus = getStatusFromValue(metadata.madrasa_application_status);

    useEffect(() => {
        // Fetch initially
        metadataApi.getStats().then((stats) => {
            setMetadata(stats);
        }).catch((err) => {
            // Ignore auto-cancellation errors (happens in React StrictMode dev double-mount)
            if (err?.isAbort) return;
            console.error('Failed to load metadata in StatusProvider:', err);
        }).finally(() => {
            setCheckingStatus(false);
        });

        // Subscribe to changes (Only ONE subscription for the entire app!)
        const unsubscribe = metadataApi.subscribeStats((record) => {
            setMetadata((prev) => ({
                ...prev,
                [record.key]: record.value,
                [`_${record.key}_record`]: record
            }));
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <StatusContext.Provider value={{ metadata, participantStatus, madrasaStatus, checkingStatus }}>
            {children}
        </StatusContext.Provider>
    );
};

export const useRegistrationStatus = () => {
    const context = useContext(StatusContext);
    if (!context) {
        throw new Error('useRegistrationStatus must be used within a StatusProvider');
    }
    return context;
};
