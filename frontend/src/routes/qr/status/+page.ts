import api from "$lib/api";

export async function load({ url }) {
    const qrId = url.searchParams.get('id');
    // if (!qrId) {
    //     return {
    //         status: 400,
    //         error: 'QR ID is required'
    //     };
    // }
    // const qrData = await api.getQR(qrId!);
    
    return { qrId };
}

export const ssr = false;

export const prerender = true;
