import React, { useState, useEffect, useRef } from 'react';

import { apiFetch } from "../../../lib/api";

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import Add from '@mui/icons-material/Add';
import AddCircleOutline from '@mui/icons-material/AddCircleOutlined';
import MailOutline from '@mui/icons-material/MailOutlined';
import Close from '@mui/icons-material/Close';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import BorderColorOutlined from '@mui/icons-material/BorderColorOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';

import JoditEditor from 'jodit-react';

const TABS = [
    { key: 'agreements', label: 'Agreements', icon: <DescriptionOutlined className="!text-[18px]" /> },
    { key: 'templates', label: 'Email templates', icon: <MailOutline className="!text-[18px]" /> },
];

const JODIT_CONFIG = {
    height: 300,
    toolbarAdaptive: false,
    buttons: [
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'ul', 'ol', '|',
        'font', 'fontsize', 'brush', 'paragraph', '|',
        'align', '|',
        'link', 'table', '|',
        'undo', 'redo', '|',
        'eraser', 'fullsize',
    ],
    removeButtons: ['source', 'video', 'image', 'file'],
    showXPathInStatusbar: false,
    showCharsCounter: false,
    showWordsCounter: false,
    placeholder: 'Write your email content here…',
};

const AGREEMENT_HIGHLIGHTS = [
    {
        key: 'compliance',
        icon: <ShieldOutlined className="!text-[18px] !text-[#1c5dbe]" />,
        title: 'Legal Compliance',
        description: 'Certified templates that meet all DOT and federal requirements.',
    },
    {
        key: 'esign',
        icon: <BorderColorOutlined className="!text-[18px] !text-[#1c5dbe]" />,
        title: 'Smart E-Sign',
        description: 'Integrated DocuSign workflows for instant digital execution.',
    },
    {
        key: 'library',
        icon: <ContentCopyOutlined className="!text-[18px] !text-[#1c5dbe]" />,
        title: 'Global Library',
        description: 'Browse over 50+ pre-vetted industry contract variations.',
    },
];

function CarrierSettings() {

    const [activeTab, setActiveTab] = useState('agreements');
    const account_token = localStorage.getItem(import.meta.env.VITE_ACCOUNT_TOKEN);

    return (

        <div className="min-h-screen bg-[#F6F7F0] p-[14px] sm:p-[20px] xl:p-[32px]">
            <div>

                {/* Header - preserved standard layout */}
                <div className="mb-8">
                    <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">
                        Carrier Settings
                    </h1>

                    <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
                        Manage carrier agreements and the email templates sent during onboarding.
                    </p>
                </div>

                {/* Centered bounded section for Tabs and Cards */}
                <div className="max-w-[1200px] mx-auto">

                    {/* Tabs */}
                    <div className="inline-flex items-center gap-[4px] bg-[#EFF0ED] rounded-[12px] p-[4px] mb-[24px]">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-[8px] px-[16px] py-[9px] rounded-[9px] text-[12px] font-[600] uppercase tracking-wide transition-colors ${
                                    activeTab === tab.key
                                        ? 'bg-white text-[#1c5dbe] shadow-sm'
                                        : 'text-[#7c8fac] hover:text-[#111827]'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'agreements' && (
                        <AgreementsPanel account_token={account_token} />
                    )}

                    {activeTab === 'templates' && (
                        <TemplatesPanel account_token={account_token} />
                    )}

                </div>

            </div>
        </div>
    );
}
function AgreementsPanel({ account_token }) {

    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [renameTarget, setRenameTarget] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const fileInputRef = useRef(null);

    const loadAgreements = () => {

        setLoading(true);

apiFetch("/broker/carrier/agreements/list")
    .then((data) => {
        setAgreements(data?.agreements || data?.data || []);
    })
    .catch(() => {
        setAgreements([]);
    })
    .finally(() => {
        setLoading(false);
    });
    };

    useEffect(() => {
        loadAgreements();
    }, []);

    const openUpload = () => {
        setUploadFile(null);
        setUploadError('');
        setUploadOpen(true);
    };

    const handleFileChange = (e) => {

        const file = e.target.files?.[0];

        if (!file) {
            setUploadFile(null);
            return;
        }

        if (file.type !== 'application/pdf') {
            setUploadFile(null);
            setUploadError('Only PDF files are supported.');
            return;
        }

        setUploadError('');
        setUploadFile(file);
    };

    const submitUpload = () => {

        if (!uploadFile) return;

        setUploading(true);

        const derivedName = uploadFile.name.replace(/\.pdf$/i, '');

        const formData = new FormData();
        formData.append('account_token', account_token);
        formData.append('name', derivedName);
        formData.append('file', uploadFile);

apiFetch("/broker/carrier/agreements/upload", {
    method: "POST",
    body: formData,
})
    .then(() => {
        setUploadOpen(false);
        loadAgreements();
    })
    .finally(() => {
        setUploading(false);
    });
    };

    const submitRename = () => {

        if (!renameTarget || !renameValue.trim()) return;

        const formData = new FormData();
        formData.append('account_token', account_token);
        formData.append('agreement_id', renameTarget.id);
        formData.append('name', renameValue.trim());

  apiFetch("/broker/carrier/agreements/rename", {
    method: "POST",
    body: formData,
}).then(() => {
    setRenameTarget(null);
    loadAgreements();
});
    };

    const submitDelete = () => {

        if (!deleteTarget) return;

        const formData = new FormData();
        formData.append('account_token', account_token);
        formData.append('agreement_id', deleteTarget.id);

       apiFetch("/broker/carrier/agreements/delete", {
    method: "POST",
    body: formData,
}).then(() => {
    setDeleteTarget(null);
    loadAgreements();
});
    };

    return (
        <div className="rounded-[16px] border border-[#d9e1ee] bg-white shadow-sm overflow-hidden">

            <div className="flex items-center justify-between px-[24px] py-[18px] border-b border-[#d9e1ee]">
                <div>
                    <div className="text-[14px] font-[700] text-[#0f172a]">Compliance Documents</div>
                    <div className="text-[12px] text-[#64748b] mt-[2px]">Legally binding agreements required for carrier activation.</div>
                </div>
                <button
                    onClick={openUpload}
                    className="flex items-center gap-[8px] bg-[#164a99] text-white text-[13px] font-[500] px-[16px] py-[15px] rounded-[10px] hover:bg-[#164a99] transition-colors"
                >
                    <AddCircleOutline className="!text-[18px]" />
                    Upload new agreement
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-[48px] text-[#64748b] text-[14px] gap-[10px]">
                    <CircularProgress size={18} />
                    Loading agreements…
                </div>
            )}

            {!loading && agreements.length === 0 && (
                <div className="flex flex-col items-center justify-center px-[24px] py-[56px] text-center">

                    <div className="w-[96px] h-[96px] rounded-[20px] bg-[#F4F7FC] flex items-center justify-center mb-[24px]">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 4C7.89543 4 7 4.89543 7 6V34C7 35.1046 7.89543 36 9 36H27C28.1046 36 29 35.1046 29 34V13L20 4H9Z" stroke="#CBD5E1" strokeWidth="1.6" strokeLinejoin="round"/>
                            <path d="M20 4V13H29" stroke="#CBD5E1" strokeWidth="1.6" strokeLinejoin="round"/>
                            <line x1="12" y1="20" x2="22" y2="20" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round"/>
                            <line x1="12" y1="25" x2="19" y2="25" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round"/>
                            <path d="M24 27L33 18.5C33.8 17.7 35 17.7 35.7 18.5C36.5 19.2 36.5 20.4 35.7 21.2L27 29.7L23 31L24 27Z" fill="#EAF2FF" stroke="#1c5dbe" strokeWidth="1.4" strokeLinejoin="round"/>
                        </svg>
                    </div>

                    <div className="text-[15px] font-[700] text-[#0f172a]">No agreements configured</div>
                    <div className="text-[12.5px] text-[#64748b] mt-[6px] max-w-[420px]">
                        Your library is currently empty. Upload your standard carrier contracts or use our industry templates to start the automation.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px] mt-[32px] w-full max-w-[820px]">
                        {AGREEMENT_HIGHLIGHTS.map((item) => (
                            <div key={item.key} className="text-left rounded-[14px] border border-[#eef1f6] p-[18px] bg-[#fbfcfe]">
                                <div className="w-[34px] h-[34px] rounded-[9px] bg-[#EAF2FF] flex items-center justify-center mb-[14px]">
                                    {item.icon}
                                </div>
                                <div className="text-[13px] font-[700] text-[#0f172a]">{item.title}</div>
                                <div className="text-[12px] text-[#64748b] mt-[6px] leading-[1.5]">{item.description}</div>
                            </div>
                        ))}
                    </div>

                </div>
            )}

            {!loading && agreements.length > 0 && (
                <div className="divide-y divide-[#eef1f6]">
                    {agreements.map((agreement) => (
                        <div key={agreement.id} className="flex items-center justify-between px-[24px] py-[16px] hover:bg-[#fbfcfe]">

                            <div className="flex items-center gap-[12px] min-w-0">
                                <div className="w-[38px] h-[38px] rounded-[10px] bg-[#EBF5FF] flex items-center justify-center shrink-0">
                                    <DescriptionOutlined className="!text-[18px] !text-[#1c5dbe]" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[13px] font-[600] text-[#0f172a] truncate">{agreement.name}</div>
                                    <div className="text-[11px] text-[#94a3b8] mt-[2px]">
                                        Updated {agreement.updated_at || '-'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-[4px] shrink-0">
                                {agreement.url && (
                                    <IconButton size="small" onClick={() => window.open(agreement.url, '_blank')} title="Download">
                                        <DownloadOutlined className="!text-[18px] !text-[#64748b]" />
                                    </IconButton>
                                )}
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setRenameTarget(agreement);
                                        setRenameValue(agreement.name);
                                    }}
                                    title="Rename"
                                >
                                    <EditOutlined className="!text-[18px] !text-[#64748b]" />
                                </IconButton>
                                <IconButton size="small" onClick={() => setDeleteTarget(agreement)} title="Delete">
                                    <DeleteOutline className="!text-[18px] !text-[#dc2626]" />
                                </IconButton>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle className="font-bold text-[#0f172a]">Upload agreement</DialogTitle>
                <DialogContent>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full mt-[8px] py-[14px] px-[16px] rounded-[12px] border border-dashed border-[#cbd5e1] text-[13px] text-[#64748b] hover:border-[#94a3b8] hover:bg-[#f8fafc] transition-colors flex items-center justify-center gap-[8px]"
                    >
                        <UploadFileOutlined className="!text-[18px]" />
                        {uploadFile ? uploadFile.name : 'Choose a file (PDF only)'}
                    </button>
                    {uploadError && (
                        <div className="text-[12px] text-[#dc2626] mt-[8px]">{uploadError}</div>
                    )}
                </DialogContent>
                <DialogActions className="p-4">
                    <Button onClick={() => setUploadOpen(false)} className="text-[#64748b] font-semibold">Cancel</Button>
                    <Button
                        onClick={submitUpload}
                        disabled={!uploadFile || uploading}
                        variant="contained"
                    >
                        {uploading ? <CircularProgress size={16} className="!text-white" /> : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rename dialog */}
            <Dialog open={!!renameTarget} onClose={() => setRenameTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle className="font-bold text-[#0f172a]">Rename agreement</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Agreement name"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions className="p-4">
                    <Button onClick={() => setRenameTarget(null)} className="text-[#64748b] font-semibold">Cancel</Button>
                    <Button onClick={submitRename} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle className="font-bold text-[#0f172a]">Delete agreement?</DialogTitle>
                <DialogContent>
                    <p className="text-[14px] text-[#64748b]">
                        This will permanently remove <span className="font-[700] text-[#0f172a]">{deleteTarget?.name}</span>. This can't be undone.
                    </p>
                </DialogContent>
                <DialogActions className="p-4">
                    <Button onClick={() => setDeleteTarget(null)} className="text-[#64748b] font-semibold">Cancel</Button>
                    <Button onClick={submitDelete} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>

        </div>
    );
}

function TemplatesPanel({ account_token }) {

    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const loadTemplates = () => {

        setLoading(true);

apiFetch("/broker/carrier/email-templates/list")
    .then((data) => {
        setTemplates(data?.templates || data?.data || []);
    })
    .catch(() => {
        setTemplates([]);
    })
    .finally(() => {
        setLoading(false);
    });
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const openNew = () => {
        setEditingTemplate({ id: null, name: '', subject: '', body: '' });
        setEditorOpen(true);
    };

    const openEdit = (template) => {
        setEditingTemplate(template);
        setEditorOpen(true);
    };

    const submitDelete = () => {

        if (!deleteTarget) return;

        const formData = new FormData();
        formData.append('account_token', account_token);
        formData.append('template_id', deleteTarget.id);

       apiFetch("/broker/carrier/email-templates/delete", {
    method: "POST",
    body: formData,
}).then(() => {
    setDeleteTarget(null);
    loadTemplates();
});
    };

    return (
        <div className="rounded-[16px] border border-[#d9e1ee] bg-white shadow-sm overflow-hidden">

            <div className="flex items-center justify-between px-[24px] py-[18px] border-b border-[#d9e1ee]">
                <div>
                    <div className="text-[14px] font-[700] text-[#0f172a]">Email templates</div>
                    <div className="text-[12px] text-[#64748b] mt-[2px]">Emails sent automatically during carrier onboarding.</div>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-[8px] bg-[#164a99] text-white text-[13px] font-[500] px-[16px] py-[15px] rounded-[10px] hover:bg-[#164a99] transition-colors"
                >
                    <Add className="!text-[18px]" />
                    New template
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-[48px] text-[#64748b] text-[14px] gap-[10px]">
                    <CircularProgress size={18} />
                    Loading templates…
                </div>
            )}

            {!loading && templates.length === 0 && (
                <div className="flex flex-col items-center justify-center py-[48px] text-center">
                    <MailOutline className="!text-[32px] !text-[#cbd5e1] mb-[10px]" />
                    <div className="text-[14px] font-[600] text-[#0f172a]">No templates yet</div>
                    <div className="text-[12px] text-[#64748b] mt-[4px]">Create your first email template to get started.</div>
                </div>
            )}

            {!loading && templates.length > 0 && (
                <div className="divide-y divide-[#eef1f6]">
                    {templates.map((template) => (
                        <div key={template.id} className="flex items-center justify-between px-[24px] py-[16px] hover:bg-[#fbfcfe]">

                            <div className="flex items-center gap-[12px] min-w-0">
                                <div className="w-[38px] h-[38px] rounded-[10px] bg-[#fdf2e9] flex items-center justify-center shrink-0">
                                    <MailOutline className="!text-[18px] !text-[#d97706]" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[13px] font-[600] text-[#0f172a] truncate">{template.name}</div>
                                    <div className="text-[11px] text-[#94a3b8] mt-[2px] truncate">{template.subject}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-[4px] shrink-0">
                                <IconButton size="small" onClick={() => openEdit(template)} title="Edit">
                                    <EditOutlined className="!text-[18px] !text-[#64748b]" />
                                </IconButton>
                                <IconButton size="small" onClick={() => setDeleteTarget(template)} title="Delete">
                                    <DeleteOutline className="!text-[18px] !text-[#dc2626]" />
                                </IconButton>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            {editorOpen && (
                <TemplateEditorDialog
                    account_token={account_token}
                    template={editingTemplate}
                    onClose={() => setEditorOpen(false)}
                    onSaved={() => {
                        setEditorOpen(false);
                        loadTemplates();
                    }}
                />
            )}

            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle className="font-bold text-[#0f172a]">Delete template?</DialogTitle>
                <DialogContent>
                    <p className="text-[14px] text-[#64748b]">
                        This will permanently remove <span className="font-[700] text-[#0f172a]">{deleteTarget?.name}</span>. This can't be undone.
                    </p>
                </DialogContent>
                <DialogActions className="p-4">
                    <Button onClick={() => setDeleteTarget(null)} className="text-[#64748b] font-semibold">Cancel</Button>
                    <Button onClick={submitDelete} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>

        </div>
    );
}

function TemplateEditorDialog({ account_token, template, onClose, onSaved }) {

    const [name, setName] = useState(template?.name || '');
    const [subject, setSubject] = useState(template?.subject || '');
    const [body, setBody] = useState(template?.body || '');
    const [saving, setSaving] = useState(false);
    const editorRef = useRef(null);

    const submitSave = () => {

        if (!name.trim() || !subject.trim()) return;

        setSaving(true);

        const formData = new FormData();
        formData.append('account_token', account_token);
        if (template?.id) formData.append('template_id', template.id);
        formData.append('name', name.trim());
        formData.append('subject', subject.trim());
        formData.append('body', body);

       apiFetch("/broker/carrier/email-templates/save", {
    method: "POST",
    body: formData,
})
    .then(() => {
        onSaved();
    })
    .finally(() => {
        setSaving(false);
    });
    };

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px', overflow: 'hidden' } }}>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-[28px] py-[20px] bg-white border-b border-[#eef1f6]">
                <div className="flex items-center gap-[14px]">
                    <div className="w-[40px] h-[40px] rounded-[12px] bg-[#eaf2ff] flex items-center justify-center shrink-0">
                        <MailOutline className="!text-[19px] !text-[#1c5dbe]" />
                    </div>
                    <div>
                        <div className="text-[16px] font-[700] text-[#0f172a]">
                            {template?.id ? 'Edit email template' : 'New email template'}
                        </div>
                        <div className="text-[12.5px] text-[#94a3b8] mt-[1px]">
                            Sent automatically during carrier onboarding
                        </div>
                    </div>
                </div>
                <IconButton size="small" onClick={onClose}>
                    <Close className="!text-[19px] !text-[#64748b]" />
                </IconButton>
            </div>

            <div className="px-[28px] py-[26px] bg-white overflow-y-auto" style={{ maxHeight: 620 }}>

                <div className="mb-[24px]">
                    <label className="block text-[11px] font-[700] text-[#94a3b8] uppercase tracking-[0.08em] mb-[8px]">
                        Template name
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Onboarding welcome email"
                        className="w-full text-[15px] font-[600] text-[#0f172a] placeholder:text-[#cbd5e1] placeholder:font-[400] border border-[#e2e8f0] focus:border-[#1c5dbe] outline-none rounded-[10px] px-[14px] py-[11px] transition-colors bg-[#fbfcfe]"
                    />
                </div>

                <div className="mb-[28px]">
                    <label className="block text-[11px] font-[700] text-[#94a3b8] uppercase tracking-[0.08em] mb-[8px]">
                        Subject line
                    </label>
                    <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Welcome aboard"
                        className="w-full text-[14px] text-[#0f172a] placeholder:text-[#cbd5e1] border border-[#e2e8f0] focus:border-[#1c5dbe] outline-none rounded-[10px] px-[14px] py-[11px] transition-colors bg-[#fbfcfe]"
                    />
                </div>

                <label className="block text-[11px] font-[700] text-[#94a3b8] uppercase tracking-[0.08em] mb-[10px]">
                    Email body
                </label>

                <div className="rounded-[10px] border border-[#e2e8f0] overflow-hidden">
                    <JoditEditor
                        ref={editorRef}
                        value={body}
                        config={JODIT_CONFIG}
                        onBlur={(newContent) => setBody(newContent)}
                    />
                </div>

            </div>

            <DialogActions className="p-4 border-t border-[#eef1f6] bg-white">
                <Button onClick={onClose} className="text-[#64748b] font-semibold">Cancel</Button>
                <Button
                    onClick={submitSave}
                    disabled={!name.trim() || !subject.trim() || saving}
                    variant="contained"
                >
                    {saving ? <CircularProgress size={16} className="!text-white" /> : 'Save template'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default CarrierSettings;