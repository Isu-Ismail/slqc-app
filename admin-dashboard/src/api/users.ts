import { pb } from './db';

export interface UserRecord {
    id: string;
    email: string;
    name: string;
    designation: string;
    mobile: string;
    verified: boolean;
    created: string;
    updated: string;
}

let organisersCache: { data: UserRecord[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const usersApi = {
    /**
     * Synchronously get cached users if valid
     */
    getCachedOrganisers(): UserRecord[] | null {
        if (organisersCache && Date.now() - organisersCache.timestamp < CACHE_TTL) {
            return organisersCache.data;
        }
        return null;
    },

    /**
     * Fetch all users
     */
    async getAllOrganisers(forceRefresh = false): Promise<UserRecord[]> {
        if (!forceRefresh && organisersCache && Date.now() - organisersCache.timestamp < CACHE_TTL) {
            return organisersCache.data;
        }
        const data = await pb.collection('users').getFullList<UserRecord>({
            sort: '-created',
        });
        organisersCache = { data, timestamp: Date.now() };
        return data;
    },

    /**
     * Delete a user
     */
    async deleteOrganiser(id: string): Promise<boolean> {
        return await pb.collection('users').delete(id);
    },

    /**
     * Create a new user and enqueue welcome email
     */
    async createOrganiser(data: any): Promise<UserRecord> {
        // 1. Create the user in PocketBase
        const user = await pb.collection('users').create<UserRecord>({
            email: data.email,
            password: data.password,
            passwordConfirm: data.password,
            name: data.name,
            designation: data.designation,
            mobile: data.mobile,
            emailVisibility: true,
        }, {
            headers: {
                'x-set-verified': data.verified ? 'true' : 'false'
            }
        });

        // 2. Queue the email via mail_queue
        try {
            await pb.collection('mail_queue').create({
                to_email: data.email,
                to_name: data.name,
                subject: 'Dashboard Login Credentials',
                body: `Hello ${data.name},\n\nYou have been added as an organiser (${data.designation}) for the State Level Quran Competition.\n\nYour login credentials are:\nEmail: ${data.email}\nPassword: ${data.password}\n\nPlease change your password after logging in.`,
                body_html: `<p>Hello ${data.name},</p><p>You have been added as an organiser (${data.designation}) for the State Level Quran Competition.</p><p>Your login credentials are:</p><ul><li><strong>Email:</strong> ${data.email}</li><li><strong>Password:</strong> ${data.password}</li></ul><p>Please change your password after logging in.</p>`,
                type: 'individual_confirmation',
                status: 'pending',
                attempts: 0,
                record_id: user.id
            });
        } catch (mailErr) {
            console.error("Failed to queue welcome email:", mailErr);
            // We don't throw here because the user was successfully created
        }

        return user;
    }
};
