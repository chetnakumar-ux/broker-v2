import React, { useState, useEffect } from 'react';

import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';

import Main from 'components/Main';
import CarrierCard from 'components/blocks/CarrierCards';

import { useNavigate } from 'react-router-dom';

function CarrierCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                    <Skeleton variant="text" width={180} height={22} />
                    <div className="flex gap-2">
                        <Skeleton variant="rounded" width={90} height={22} />
                        <Skeleton variant="rounded" width={110} height={22} />
                    </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                    <Skeleton variant="rounded" width={140} height={22} />
                    <Skeleton variant="rounded" width={120} height={22} />
                    <Skeleton variant="rounded" width={70} height={22} />
                </div>
            </div>
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="text" width="50%" height={18} />
        </div>
    );
}

/* ---------- PAGE ---------- */
function ShortlistedCarriers() {

    const navigate = useNavigate();

    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [loading, setLoading] = useState(true);
    const [carriers, setCarriers] = useState([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        loadShortlistedCarriers();
    }, []);

    function getAccountToken() {
        return localStorage.getItem(import.meta.env.VITE_ACCOUNT_TOKEN);
    }

    function handleCarrierClick(carrier) {
        navigate('/carriers/' + carrier.carrier_id);
    }

    function loadShortlistedCarriers() {
        setLoading(true);

        const account_token = getAccountToken();

        fetch(
            `${import.meta.env.VITE_ROOT_PROD}/app/profile/carriers/shortlisted/listv2`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${account_token}`
                },
                body: JSON.stringify({
                    account_token: account_token
                })
            }
        )
            .then(res => res.json())
            .then(data => {
                const records = data.records || [];
                setCarriers(records);
                setTotal(data.total ?? records.length);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }

    function removeFromShortlist(carrier_id) {

        setSuccessMessage('');
        setErrorMessage('');

        const account_token = getAccountToken();

        fetch(
            `${import.meta.env.VITE_ROOT_PROD}/app/profile/carriers/removev2`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${account_token}`,
                },
                body: JSON.stringify({
                    carrier_id,
                })
            }
        )
            .then(res => res.json())
            .then(data => {

                if (data?.status === false) {
                    setErrorMessage(data?.message);
                    setTimeout(function () {
                        setErrorMessage('');
                    }, 4000);
                    return;
                }

                setCarriers(prev =>
                    prev.filter(c => c.carrier_id !== carrier_id)
                );

                setTotal(prev => Math.max(prev - 1, 0));

                setSuccessMessage(data?.message);

                setTimeout(function () {
                    setSuccessMessage('');
                }, 4000);

            })
            .catch(err => {
                console.log('Remove failed', err);
                setErrorMessage('Something went wrong');
                setTimeout(function () {
                    setErrorMessage('');
                }, 4000);
            });
    }

    /* ---------- STAT CARD ---------- */
    const shortlistedHeader = (
        <div className="flex justify-end mb-5">
            <div className="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white px-5 py-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-blue-50 shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                        <path d="M3 7h11v8H3z" />
                        <path d="M14 10h4l3 3v2h-7z" />
                        <circle cx="6" cy="19" r="1.5" />
                        <circle cx="17" cy="19" r="1.5" />
                    </svg>
                </div>
                <div>
                    <div className="text-xl font-semibold text-gray-900 leading-tight tabular-nums">
                        {loading ? '–' : total}
                    </div>
                    <div className="text-xs text-gray-500 leading-tight mt-0.5">Total shortlisted</div>
                </div>
            </div>
        </div>
    );

    return (
        <Main
            active_page="profile"
            page="shortlisted_carriers"
            full_width
            title="Shortlisted carriers"
            subtitle="Carriers you've saved for quick access and comparison."
            success_message={successMessage}
            error_message={errorMessage}
        >
            <Grid container spacing={3}>
                <Grid size={12}>
                    <div className="p-3 md:p-4 lg:p-6">
                        <div className="max-w-[1100px] mx-auto">

                            {shortlistedHeader}

                            <div className="flex flex-col gap-3">

                                {loading &&
                                    [...Array(4)].map((_, i) => (
                                        <CarrierCardSkeleton key={i} />
                                    ))
                                }

                                {!loading && carriers.length === 0 && (
                                    <div className="text-center py-16 px-6 border border-dashed border-gray-200 rounded-xl text-sm text-gray-500">
                                        No shortlisted carriers found — carriers you save will show up here.
                                    </div>
                                )}

                                {!loading && carriers.length > 0 &&
                                    carriers.map(carrier => (
                                        <div key={carrier.carrier_id}>
                                            <CarrierCard
                                                carrier={carrier}
                                                showRemove
                                                onRemove={removeFromShortlist}
                                                onClick={handleCarrierClick}
                                            />
                                        </div>
                                    ))
                                }

                            </div>
                        </div>
                    </div>
                </Grid>
            </Grid>
        </Main>
    );
}

export default ShortlistedCarriers;