import { create } from 'zustand';

export type Language = 'en' | 'hi';

export const translations = {
  en: {
    // Navigation
    nav_home: 'Home',
    nav_log: 'Log Progress',
    nav_files: 'Site Files',
    nav_history: 'History',

    // Header & Meta
    role_supervisor: 'Site Supervisor',
    status_offline: 'Offline',
    status_online: 'Online',
    alerts_approvals: 'Alerts & Approvals',
    no_notifications: 'No recent notifications',
    mark_all_read: 'Mark all read',
    sign_out: 'Sign Out',

    // Log Progress Page
    page_title: 'Log Field Progress',
    page_subtitle: 'Voice, text, photo, or audio file updates linked to P6 baseline',
    mic_idle: 'Tap to Speak',
    mic_recording: 'Recording... Tap to Stop',
    mic_listening: 'Listening (English)...',
    transcribing: 'Transcribing speech...',
    label_notes: 'Daily Work Description',
    placeholder_notes: 'e.g. Completed spool erection for Line 24 in Unit 3 today. 4 joints fitted up, bolt-up in progress...',
    btn_translate_to_en: 'Translate to English (EN)',
    btn_translate_to_hi: 'Translate to Hindi (हिन्दी)',
    btn_translating: 'Translating...',
    translate_success: 'Translated!',
    attach_audio_file: 'Attach Audio Note',
    attach_photo_scan: 'Attach Photo / DPR Scan',
    quick_templates: 'Quick Dictation Samples',
    btn_submit: 'Submit Report for AI Extraction',
    btn_submitting: 'Processing & Matching...',
    queued_offline: 'Queued — will send when online',
    success_title: 'Progress Logged Successfully!',
    success_msg: 'Matched to P6 Baseline Activity with confidence score.',
    view_submission: 'View Submission',
    log_another: 'Log Another Activity',
    voice_card_title: 'Voice Dictation & Audio Note',
    upload_voice_note: 'Upload Voice Note',
    target_assigned_activity: 'Target Assigned Activity',
    auto_match_option: '⚡ Auto-Match across my active tasks (AI Engine)',
    discipline_label: 'Discipline',
    location_label: 'Site Location',
    attach_file_label: 'Attach Site Photo, Scan, or DPR File (Optional)',
    translate_action: 'Translate',
    voice_inserted_badge: 'Voice Dictated & Inserted',
    voice_lang_label: 'Spoken / Regional Language',
    auto_translated_to_page: 'Auto-translated to page language',
    submitted_english_notice: 'Converted to English for Central Planner Cockpit & P6 Baseline',

    // Home Page - Hero & Stats
    home_workspace_title: 'Field Supervisor Workspace',
    home_expansion_subtitle: 'Numaligarh Unit 3 Expansion',
    home_site_terminal: 'Site Terminal',
    home_viewing_tasks_for: 'Viewing tasks for',
    home_viewing_tasks_desc: 'Review your assigned schedule, log site activities, and flag operational blockers.',
    home_raise_blocker_btn: 'Raise Blocker / Issue',
    home_live_progress_status: 'Live Progress Status',
    home_remaining_tasks: 'Remaining Tasks',
    home_overall_progress: 'Overall Progress',
    home_completion_target: 'Completion Target',
    home_tasks_completed: 'tasks completed',
    home_quick_actions: 'Quick Field Actions',
    home_quick_log: 'Quick Voice / Text Entry',
    home_upload_doc: 'Upload Document / Scan',
    home_site_files: 'Site Drawings & Files',
    home_total_tasks: 'Total Assigned',
    home_in_progress: 'In Progress',
    home_completed: 'Completed',
    home_delayed: 'Delayed / Overdue',
    home_assigned_activities_title: 'Assigned Schedule Activities',
    home_filter_all: 'All',
    home_filter_in_progress: 'In Progress',
    home_filter_completed: 'Completed',
    home_filter_delayed: 'Delayed',
    home_filter_planned: 'Planned',
    home_search_placeholder: 'Search activity ID, scope, line number...',
    home_log_progress_btn: 'Log Progress',
    home_raise_blocker_action: 'Raise Blocker',
    home_starts_in: 'Starts in',
    home_days: 'days',
    home_sequence_locked: 'Sequence Locked',
    home_recent_field_logs: 'Recent Field Logs',
    home_view_all_history: 'View all in history',
    home_status_matched: 'Matched',
    home_status_pending: 'Pending Review',
    home_status_rejected: 'Rejected',
    home_all_on_schedule: 'All assigned tasks on schedule',
    home_no_activities_found: 'No activities found matching active filter.',
    home_modal_blocker_title: 'Raise Site Blocker / Operational Issue',
    home_modal_category: 'Issue Category',
    home_modal_desc: 'Issue Description & Site Impact',
    home_modal_desc_placeholder: 'Describe the bottleneck, material shortage, permit delay, or safety concern...',
    home_modal_submit: 'Submit Blocker to Planner',
    home_modal_cancel: 'Cancel',

    // Site Files Page
    files_title: 'Site Files & Field Documents',
    files_subtitle: 'Engineering drawings, DPR sheets, and field photos',
    files_upload_btn: 'Add File',
    files_all_files: 'All Files',
    files_drawings: 'Drawings',
    files_dprs: 'DPRs',
    files_photos: 'Photos',
    files_hse_qa: 'HSE & QA',
    files_cat_all: 'All Files',
    files_cat_drawing: 'Engineering Drawings',
    files_cat_dpr: 'Daily Progress (DPR)',
    files_cat_photo: 'Inspection Photos',
    files_cat_quality_hse: 'Quality & HSE Permits',
    files_cat_specification: 'Specifications',
    files_search_placeholder: 'Search files by drawing name, filename, discipline...',
    files_download: 'Download',
    files_view: 'View',
    files_uploaded_by: 'Uploaded by',
    files_no_docs: 'No site documents found matching your search or filter.',
    files_preview_title: 'Document Details',
    files_preview_category: 'CATEGORY',
    files_preview_discipline: 'DISCIPLINE',
    files_preview_location: 'LOCATION',
    files_preview_filesize: 'FILE SIZE',
    files_preview_uploadedby: 'UPLOADED BY',
    files_preview_date: 'DATE',
    files_preview_notes: 'Notes & Details:',
    files_preview_close: 'Close',
    files_preview_download: 'Download File',
    files_modal_title: 'Add Site File / Drawing',
    files_modal_success_title: 'File Added to Site Repository!',
    files_modal_success_msg: 'Document is now available for your site team and planners.',
    files_modal_select_file: 'Select File',
    files_modal_choose_prompt: 'Tap to choose File or Photo',
    files_modal_supports: 'Supports .pdf, .dwg, .xlsx, .csv, .jpg, .png (up to 50MB)',
    files_modal_doc_title: 'Document Title',
    files_modal_doc_placeholder: 'e.g. Unit 3 Line 24 Isometric Drawing',
    files_modal_cat: 'Category',
    files_modal_discipline: 'Discipline',
    files_modal_location: 'Site Location',
    files_modal_desc_label: 'Description / Field Notes (Optional)',
    files_modal_desc_placeholder: 'Provide revision notes, drawing sheet numbers, or site remarks...',
    files_modal_cancel: 'Cancel',
    files_modal_submit: 'Upload Document',

    // Submissions Page
    sub_title: 'My Site Reports & Match Log',
    sub_subtitle: 'Historical field reports with AI matching & planner verification trail',
    sub_queued_banner: 'report(s) queued locally for automatic sync',
    sub_sync_now: 'Sync Now',
    sub_ai_auto_verified: 'AI Auto-Verified',
    sub_planner_verified: 'Planner Verified',
    sub_search_placeholder: 'Search report text...',
    sub_filter_all: 'All',
    sub_filter_verified_matched: 'Verified & Matched',
    sub_filter_in_review: 'In Review / Queued',
    sub_filter_unmatched: 'Held / Unmatched',
    sub_loading: 'Loading submissions...',
    sub_no_submissions: 'No submissions found for this filter.',
    sub_offline_queue: 'Offline Queue',
    sub_queued_will_send: 'Queued — will send when online',
    sub_stored_idb: 'Stored in IndexedDB',
    sub_discipline: 'Discipline',
    sub_location: 'Location',
    sub_report_hash: 'Report',
    sub_matched_activity: 'Matched Activity:',
    sub_score_sem: 'Sem',
    sub_score_ent: 'Ent',
    sub_score_meta: 'Meta',
    sub_verified_by: 'Verified by',
    sub_on: 'on',
    sub_view_audit_log: 'View full audit log',
    sub_review_status: 'Review',
    sub_filter_matched: 'Auto-Matched',
    sub_filter_pending: 'In Review',
    sub_filter_rejected: 'Rejected',
    sub_queued_badge: 'Queued Offline',
    sub_awaiting_review: 'Awaiting Planner Review',
    sub_auto_verified: 'AI Auto-Verified',
    sub_empty_title: 'No submissions found',
    sub_empty_msg: 'You have not logged any field progress matching this filter yet.',

    // Submission Detail Page
    detail_header_title: 'Report',
    detail_header_subtitle: 'Field report submitted',
    detail_full_verification: 'Full verification trail',
    detail_verification_status: 'Verification Status',
    detail_ai_verified_high: 'AI Auto-Verified (High Confidence)',
    detail_planner_verified_label: 'Planner Verified',
    detail_pending_planner: 'Pending Engineering Planner Review',
    detail_verified_at: 'Verified:',
    detail_activity_status: 'Activity Status',
    detail_raw_title: 'Raw Site Report Text',
    detail_submitted_by: 'Submitted by field terminal',
    detail_match_log_title: 'AI Confidence Match Log',
    detail_candidate: 'candidate',
    detail_candidates: 'candidates',
    detail_no_candidates: 'No candidate matches generated yet. The AI pipeline is extracting entities from your report.',
    detail_best_match: 'Best Match',
    detail_3signal_title: '3-Signal AI Confidence Fusion',
    detail_signal_semantic_label: 'Semantic',
    detail_signal_entity_label: 'Entity/Tag',
    detail_signal_wbs_label: 'WBS Context',
    detail_final_fusion_score: 'Final Fusion Score',
    detail_tier_auto: '▶ ≥90%: AI Auto-Link to Schedule',
    detail_tier_review: '▶ 70-90%: Routes to Planner Review Queue',
    detail_tier_held: '▶ <70%: Low confidence — Unmatched Scope',
    detail_commit_box_title: 'Verification & Schedule Commit',
    detail_verified_by_label: 'Verified By:',
    detail_method_label: 'Method:',
    detail_method_ai: 'AI Auto-Match (≥90% Confidence)',
    detail_method_manual: 'Manual Planner Sign-Off',
    detail_date_label: 'Date:',
    detail_status_label: 'Activity Status:',
    detail_matched_at: 'Matched:',
    detail_explainer_note: 'Reports with ≥90% confidence are auto-linked to the baseline schedule by AI. Reports between 70–90% are sent to the Central Planner for manual verification. Below 70% are flagged as Unmatched / Novel Scope.',
    detail_title: 'Submission Review & Match Breakdown',
    detail_back: 'Back to Submissions',
    detail_raw_notes: 'Supervisor Raw Field Notes',
    detail_matched_activity: 'Matched Schedule Activity',
    detail_signals_title: '3-Signal Confidence Score',
    detail_signal_semantic: 'Semantic Similarity',
    detail_signal_entity: 'Entity Overlap',
    detail_signal_metadata: 'Metadata Context',
    detail_attached_audio: 'Attached Audio Note',
    detail_attached_photo: 'Attached Site Photo / DPR',

    // Install App Banner
    pwa_banner_installed_title: 'App Installed to Home Screen!',
    pwa_banner_installed_desc: 'You can now launch ScheduleSync directly from your mobile apps.',
    pwa_banner_app_title: 'ScheduleSync Field',
    pwa_banner_tag: 'PWA APP',
    pwa_banner_desc: 'Install to home screen for 1-tap offline site progress logging',
    pwa_banner_offline_tag: 'Full-screen · Zero lag · Works offline',
    pwa_banner_install_btn: 'Install App',

    // Language Toggle
    lang_toggle_label: 'हिन्दी',
  },
  hi: {
    // Navigation
    nav_home: 'होम',
    nav_log: 'प्रगति दर्ज करें',
    nav_files: 'साइट फ़ाइलें',
    nav_history: 'इतिहास',

    // Header & Meta
    role_supervisor: 'साइट सुपरवाइज़र',
    status_offline: 'ऑफ़लाइन',
    status_online: 'ऑनलाइन',
    alerts_approvals: 'अलर्ट और स्वीकृतियां',
    no_notifications: 'कोई नई सूचना नहीं',
    mark_all_read: 'सभी को पढ़ा हुआ चिह्नित करें',
    sign_out: 'लॉग आउट',

    // Log Progress Page
    page_title: 'साइट प्रगति दर्ज करें',
    page_subtitle: 'आवाज़, टेक्स्ट, फोटो या ऑडियो द्वारा P6 शेड्यूल से लिंक करें',
    mic_idle: 'बोलने के लिए टैप करें',
    mic_recording: 'रिकॉर्डिंग जारी... रोकने के लिए टैप करें',
    mic_listening: 'सुन रहा है (हिन्दी)...',
    transcribing: 'ऑडियो ट्रांसक्राइब हो रहा है...',
    label_notes: 'दैनिक कार्य विवरण',
    placeholder_notes: 'उदा. आज यूनिट 3 में लाइन 24 के लिए स्पूल इरेक्शन पूरा किया। 4 जॉइंट्स फिट-अप हुए, फ्लैंज बोल्टिंग जारी है...',
    btn_translate_to_en: 'अंग्रेजी में अनुवाद करें (EN)',
    btn_translate_to_hi: 'हिन्दी में अनुवाद करें (हिन्दी)',
    btn_translating: 'अनुवाद हो रहा है...',
    translate_success: 'अनुवाद पूर्ण!',
    attach_audio_file: 'ऑडियो नोट संलग्न करें',
    attach_photo_scan: 'फोटो या DPR स्कैन जोड़ें',
    quick_templates: 'त्वरित आवाज़ नमूने',
    btn_submit: 'AI एक्सट्रैक्शन के लिए सबमिट करें',
    btn_submitting: 'प्रोसेसिंग और मैचिंग जारी...',
    queued_offline: 'कतार में — ऑनलाइन होने पर भेजा जाएगा',
    success_title: 'प्रगति सफलतापूर्वक दर्ज हुई!',
    success_msg: 'कॉन्फिडेंस स्कोर के साथ P6 बेसलाइन से लिंक कर दिया गया है।',
    view_submission: 'विवरण देखें',
    log_another: 'एक और कार्य दर्ज करें',
    voice_card_title: 'आवाज़ डिक्टेशन और ऑडियो नोट',
    upload_voice_note: 'ऑडियो नोट अपलोड करें',
    target_assigned_activity: 'सौंपी गई शेड्यूल गतिविधि',
    auto_match_option: '⚡ मेरे सक्रिय कार्यों में स्वचालित मिलान (AI इंजन)',
    discipline_label: 'विभाग / ट्रेड',
    location_label: 'साइट स्थान',
    attach_file_label: 'साइट फ़ोटो, स्कैन या DPR फ़ाइल जोड़ें (वैकल्पिक)',
    translate_action: 'अनुवाद करें',
    voice_inserted_badge: 'आवाज़ डिक्टेट और दर्ज',
    voice_lang_label: 'बोली जाने वाली क्षेत्रीय भाषा',
    auto_translated_to_page: 'पृष्ठ भाषा में स्वचालित अनुवादित',
    submitted_english_notice: 'केंद्रीय प्लानर व P6 बेसलाइन के लिए अंग्रेजी में परिवर्तित',

    // Home Page - Hero & Stats
    home_workspace_title: 'फील्ड सुपरवाइज़र वर्कस्पेस',
    home_expansion_subtitle: 'नुमालीगढ़ रिफाइनरी यूनिट 3 विस्तार',
    home_site_terminal: 'साइट टर्मिनल',
    home_viewing_tasks_for: 'कार्य देख रहे हैं:',
    home_viewing_tasks_desc: 'अपना सौंपा गया शेड्यूल देखें, साइट गतिविधियाँ दर्ज करें और परिचालन अवरोधों को फ़्लैग करें।',
    home_raise_blocker_btn: 'अवरोध / समस्या दर्ज करें',
    home_live_progress_status: 'लाइव प्रगति स्थिति',
    home_remaining_tasks: 'शेष कार्य',
    home_overall_progress: 'कुल प्रगति',
    home_completion_target: 'पूर्णता लक्ष्य',
    home_tasks_completed: 'कार्य पूर्ण',
    home_quick_actions: 'त्वरित साइट क्रियाएं',
    home_quick_log: 'त्वरित आवाज़ / टेक्स्ट प्रविष्टि',
    home_upload_doc: 'दस्तावेज़ / स्कैन अपलोड करें',
    home_site_files: 'साइट ड्रॉइंग और फ़ाइलें',
    home_total_tasks: 'कुल सौंपे गए कार्य',
    home_in_progress: 'प्रगति पर',
    home_completed: 'पूर्ण',
    home_delayed: 'विलंबित / अतिदेय',
    home_assigned_activities_title: 'सौंपी गई शेड्यूल गतिविधियां',
    home_filter_all: 'सभी',
    home_filter_in_progress: 'प्रगति पर',
    home_filter_completed: 'पूर्ण',
    home_filter_delayed: 'विलंबित',
    home_filter_planned: 'नियोजित',
    home_search_placeholder: 'गतिविधि ID, कार्य, लाइन नंबर खोजें...',
    home_log_progress_btn: 'प्रगति दर्ज करें',
    home_raise_blocker_action: 'अवरोध दर्ज करें',
    home_starts_in: 'शुरू होगा',
    home_days: 'दिनों में',
    home_sequence_locked: 'क्रम लॉक है',
    home_recent_field_logs: 'हालिया साइट लॉग्स',
    home_view_all_history: 'इतिहास में सभी देखें',
    home_status_matched: 'मैच हुआ',
    home_status_pending: 'समीक्षा लंबित',
    home_status_rejected: 'अस्वीकृत',
    home_all_on_schedule: 'सभी सौंपे गए कार्य समय पर चल रहे हैं',
    home_no_activities_found: 'सक्रिय फ़िल्टर से मेल खाती कोई गतिविधि नहीं मिली।',
    home_modal_blocker_title: 'साइट अवरोध / परिचालन समस्या दर्ज करें',
    home_modal_category: 'समस्या श्रेणी',
    home_modal_desc: 'समस्या का विवरण और साइट प्रभाव',
    home_modal_desc_placeholder: 'सामग्री की कमी, परमिट में देरी, या सुरक्षा चिंता का विवरण दें...',
    home_modal_submit: 'प्लानर को अवरोध सबमिट करें',
    home_modal_cancel: 'रद्द करें',

    // Site Files Page
    files_title: 'साइट फ़ाइलें और फील्ड दस्तावेज़',
    files_subtitle: 'इंजीनियरिंग ड्रॉइंग, DPR पत्रक और फील्ड फोटो',
    files_upload_btn: 'फ़ाइल जोड़ें',
    files_all_files: 'सभी फ़ाइलें',
    files_drawings: 'ड्रॉइंग',
    files_dprs: 'DPR',
    files_photos: 'फोटो',
    files_hse_qa: 'HSE और QA',
    files_cat_all: 'सभी फ़ाइलें',
    files_cat_drawing: 'इंजीनियरिंग ड्रॉइंग',
    files_cat_dpr: 'दैनिक प्रगति (DPR)',
    files_cat_photo: 'साइट निरीक्षण फोटो',
    files_cat_quality_hse: 'गुणवत्ता व HSE परमिट',
    files_cat_specification: 'विनिर्देश (Specs)',
    files_search_placeholder: 'ड्रॉइंग नाम, फ़ाइल नाम या विभाग द्वारा खोजें...',
    files_download: 'डाउनलोड',
    files_view: 'देखें',
    files_uploaded_by: 'द्वारा अपलोड',
    files_no_docs: 'आपकी खोज या फ़िल्टर से मेल खाता कोई दस्तावेज़ नहीं मिला।',
    files_preview_title: 'दस्तावेज़ विवरण',
    files_preview_category: 'श्रेणी',
    files_preview_discipline: 'विभाग',
    files_preview_location: 'स्थान',
    files_preview_filesize: 'फ़ाइल साइज़',
    files_preview_uploadedby: 'अपलोडकर्ता',
    files_preview_date: 'तारीख',
    files_preview_notes: 'नोट्स और विवरण:',
    files_preview_close: 'बंद करें',
    files_preview_download: 'फ़ाइल डाउनलोड करें',
    files_modal_title: 'साइट फ़ाइल / ड्रॉइंग जोड़ें',
    files_modal_success_title: 'फ़ाइल साइट रिपॉजिटरी में जोड़ी गई!',
    files_modal_success_msg: 'दस्तावेज़ अब आपकी साइट टीम और प्लानर्स के लिए उपलब्ध है।',
    files_modal_select_file: 'फ़ाइल चुनें',
    files_modal_choose_prompt: 'फ़ाइल या फोटो चुनने के लिए टैप करें',
    files_modal_supports: '.pdf, .dwg, .xlsx, .csv, .jpg, .png समर्थित (50MB तक)',
    files_modal_doc_title: 'दस्तावेज़ शीर्षक',
    files_modal_doc_placeholder: 'उदा. यूनिट 3 लाइन 24 आइसोमेट्रिक ड्रॉइंग',
    files_modal_cat: 'श्रेणी',
    files_modal_discipline: 'विभाग',
    files_modal_location: 'साइट स्थान',
    files_modal_desc_label: 'विवरण / फील्ड नोट्स (वैकल्पिक)',
    files_modal_desc_placeholder: 'रिवीजन नोट्स, शीट नंबर या साइट टिप्पणियां लिखें...',
    files_modal_cancel: 'रद्द करें',
    files_modal_submit: 'दस्तावेज़ अपलोड करें',

    // Submissions Page
    sub_title: 'मेरे साइट रिपोर्ट्स और मैच लॉग',
    sub_subtitle: 'AI मैचिंग और प्लानर सत्यापन ट्रेल के साथ ऐतिहासिक फील्ड रिपोर्ट्स',
    sub_queued_banner: 'रिपोर्ट(्स) ऑटो-सिंक के लिए स्थानीय रूप से कतारबद्ध',
    sub_sync_now: 'अभी सिंक करें',
    sub_ai_auto_verified: 'AI ऑटो-सत्यापित',
    sub_planner_verified: 'प्लानर द्वारा सत्यापित',
    sub_search_placeholder: 'रिपोर्ट टेक्स्ट खोजें...',
    sub_filter_all: 'सभी',
    sub_filter_verified_matched: 'सत्यापित और मैच्ड',
    sub_filter_in_review: 'समीक्षा में / कतारबद्ध',
    sub_filter_unmatched: 'लंबित / अनमैच्ड',
    sub_loading: 'सबमिशन लोड हो रहे हैं...',
    sub_no_submissions: 'इस फ़िल्टर के लिए कोई सबमिशन नहीं मिला।',
    sub_offline_queue: 'ऑफ़लाइन कतार',
    sub_queued_will_send: 'कतार में — ऑनलाइन होने पर भेजा जाएगा',
    sub_stored_idb: 'IndexedDB में सुरक्षित',
    sub_discipline: 'विभाग',
    sub_location: 'स्थान',
    sub_report_hash: 'रिपोर्ट',
    sub_matched_activity: 'मैच की गई गतिविधि:',
    sub_score_sem: 'सिमेंटिक',
    sub_score_ent: 'एंटीटी',
    sub_score_meta: 'मेटा',
    sub_verified_by: 'द्वारा सत्यापित',
    sub_on: 'को',
    sub_view_audit_log: 'पूरा ऑडिट लॉग देखें',
    sub_review_status: 'समीक्षा',
    sub_filter_matched: 'स्वचालित मैच',
    sub_filter_pending: 'समीक्षा में',
    sub_filter_rejected: 'अस्वीकृत',
    sub_queued_badge: 'ऑफ़लाइन कतार',
    sub_awaiting_review: 'प्लानर समीक्षा की प्रतीक्षा',
    sub_auto_verified: 'AI ऑटो-सत्यापित',
    sub_empty_title: 'कोई सबमिशन नहीं मिला',
    sub_empty_msg: 'आपने अभी तक इस फ़िल्टर से मेल खाती कोई प्रगति दर्ज नहीं की है।',

    // Submission Detail Page
    detail_header_title: 'रिपोर्ट',
    detail_header_subtitle: 'फील्ड रिपोर्ट सबमिट की गई',
    detail_full_verification: 'पूर्ण सत्यापन ट्रेल',
    detail_verification_status: 'सत्यापन स्थिति',
    detail_ai_verified_high: 'AI ऑटो-सत्यापित (उच्च विश्वसनीयता)',
    detail_planner_verified_label: 'प्लानर सत्यापित',
    detail_pending_planner: 'इंजीनियरिंग प्लानर समीक्षा लंबित',
    detail_verified_at: 'सत्यापित:',
    detail_activity_status: 'गतिविधि स्थिति',
    detail_raw_title: 'मूल साइट रिपोर्ट टेक्स्ट',
    detail_submitted_by: 'फील्ड टर्मिनल द्वारा प्रेषित',
    detail_match_log_title: 'AI कॉन्फिडेंस मैच लॉग',
    detail_candidate: 'उम्मीदवार',
    detail_candidates: 'उम्मीदवार',
    detail_no_candidates: 'अभी तक कोई मिलान उत्पन्न नहीं हुआ है। AI पाइपलाइन आपकी रिपोर्ट से डेटा निकाल रही है।',
    detail_best_match: 'सर्वश्रेष्ठ मिलान',
    detail_3signal_title: '3-सिग्नल AI कॉन्फिडेंस फ्यूजन',
    detail_signal_semantic_label: 'सिमेंटिक',
    detail_signal_entity_label: 'एंटीटी/टैग',
    detail_signal_wbs_label: 'WBS संदर्भ',
    detail_final_fusion_score: 'अंतिम फ्यूजन स्कोर',
    detail_tier_auto: '▶ ≥90%: शेड्यूल से स्वचालित AI लिंक',
    detail_tier_review: '▶ 70-90%: प्लानर समीक्षा कतार में भेजा गया',
    detail_tier_held: '▶ <70%: कम विश्वसनीयता — अनमैच्ड स्कोप',
    detail_commit_box_title: 'सत्यापन और शेड्यूल कमिट',
    detail_verified_by_label: 'द्वारा सत्यापित:',
    detail_method_label: 'पद्धति:',
    detail_method_ai: 'AI ऑटो-मैच (≥90% कॉन्फिडेंस)',
    detail_method_manual: 'प्लानर द्वारा मैनुअल अनुमोदन',
    detail_date_label: 'दिनांक:',
    detail_status_label: 'गतिविधि स्थिति:',
    detail_matched_at: 'मैच किया गया:',
    detail_explainer_note: '≥90% कॉन्फिडेंस वाली रिपोर्ट्स AI द्वारा सीधे बेसलाइन शेड्यूल से लिंक हो जाती हैं। 70–90% वाली रिपोर्ट्स प्लानर समीक्षा के लिए भेजी जाती हैं। 70% से कम को अनमैच्ड स्कोप के रूप में चिह्नित किया जाता है।',
    detail_title: 'सबमिशन समीक्षा और मिलान विवरण',
    detail_back: 'सबमिशन सूची पर वापस',
    detail_raw_notes: 'सुपरवाइज़र मूल फील्ड नोट्स',
    detail_matched_activity: 'मिलान की गई शेड्यूल गतिविधि',
    detail_signals_title: '3-सिग्नल कॉन्फिडेंस स्कोर',
    detail_signal_semantic: 'सिमेंटिक समानता (45%)',
    detail_signal_entity: 'एंटीटी ओवरलैप (35%)',
    detail_signal_metadata: 'मेटाडेटा संदर्भ (20%)',
    detail_attached_audio: 'संलग्न ऑडियो नोट',
    detail_attached_photo: 'संलग्न साइट फोटो / DPR',

    // Install App Banner
    pwa_banner_installed_title: 'ऐप होम स्क्रीन पर इंस्टॉल हो गया!',
    pwa_banner_installed_desc: 'अब आप सीधे अपने मोबाइल ऐप्स से ScheduleSync खोल सकते हैं।',
    pwa_banner_app_title: 'ScheduleSync फील्ड',
    pwa_banner_tag: 'PWA ऐप',
    pwa_banner_desc: '1-टैप ऑफ़लाइन प्रगति दर्ज करने के लिए होम स्क्रीन पर इंस्टॉल करें',
    pwa_banner_offline_tag: 'फुल-स्क्रीन · बिना रुकावट · ऑफ़लाइन काम करता है',
    pwa_banner_install_btn: 'ऐप इंस्टॉल करें',

    // Language Toggle
    lang_toggle_label: 'English',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
}

const getStoredLang = (): Language => {
  try {
    const saved = localStorage.getItem('schedulesync_supervisor_lang');
    if (saved === 'hi' || saved === 'en') return saved;
  } catch {}
  return 'en';
};

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: getStoredLang(),
  setLanguage: (lang: Language) => {
    try {
      localStorage.setItem('schedulesync_supervisor_lang', lang);
    } catch {}
    set({ language: lang });
  },
  toggleLanguage: () => {
    const next = get().language === 'en' ? 'hi' : 'en';
    try {
      localStorage.setItem('schedulesync_supervisor_lang', next);
    } catch {}
    set({ language: next });
  },
  t: (key: TranslationKey | string, fallback?: string): string => {
    const current = get().language;
    const currentDict = translations[current] as Record<string, string>;
    const enDict = translations.en as Record<string, string>;
    return currentDict[key] || enDict[key] || fallback || key;
  },
}));

export const ACTIVITY_TRANSLATIONS: Record<string, { en: string; hi: string }> = {
  'L6-PIP-101': { en: 'Erect Line 24 (12in CS pipe)', hi: 'लाइन 24 इरेक्शन (12 इंच CS पाइप)' },
  'L6-PIP-102': { en: 'Erect Line 31 (8in CS pipe)', hi: 'लाइन 31 इरेक्शन (8 इंच CS पाइप)' },
  'L6-PIP-103': { en: 'Hydrotest Line 24 manifold', hi: 'लाइन 24 मैनिफोल्ड हाइड्रोपरीक्षण' },
  'L6-PIP-104': { en: 'Fit-up spool SP-045 (12in CS)', hi: 'स्पूल SP-045 फिट-अप (12 इंच CS)' },
  'L6-PIP-105': { en: 'Install gate valve GV-01', hi: 'गेट वाल्व GV-01 स्थापना' },
  'L6-PIP-106': { en: 'Erect spool SP-044 on Line 24', hi: 'लाइन 24 पर स्पूल SP-044 इरेक्शन' },
  'L6-PIP-107': { en: 'Weld joint J-12 on Line 31', hi: 'लाइन 31 पर जॉइंट J-12 वेल्डिंग' },
  'L6-PIP-108': { en: 'Erect spool SP-046 on Line 31', hi: 'लाइन 31 पर स्पूल SP-046 इरेक्शन' },
  'L6-PIP-109': { en: 'Fit-up weld joint J-14', hi: 'वेल्ड जॉइंट J-14 फिट-अप' },
  'L6-PIP-110': { en: 'Bolt-up flange FL-08 on Line 24', hi: 'लाइन 24 पर फ्लैंज FL-08 बोल्टिंग' },
  'L6-PIP-111': { en: 'Pressure gauge PG-102 installation', hi: 'प्रेशर गेज PG-102 की स्थापना' },
  'L6-PIP-112': { en: 'Insulation wrap Line 40', hi: 'लाइन 40 इंसुलेशन रैपिंग' },
  'L6-CIV-201': { en: 'Excavate footing F-12', hi: 'फ़ुटिंग F-12 की खुदाई' },
  'L6-CIV-202': { en: 'Lay PCC for F-12 footing', hi: 'फ़ुटिंग F-12 के लिए PCC डालना' },
  'L6-CIV-203': { en: 'Cast column C-7 (RCC)', hi: 'कॉलम C-7 (RCC) कास्टिंग' },
  'L6-CIV-204': { en: 'Backfill around footing F-12', hi: 'फ़ुटिंग F-12 के चारों ओर बैकफ़िलिंग' },
  'L6-CIV-205': { en: 'Excavate trench TR-03', hi: 'ट्रेंच TR-03 की खुदाई' },
  'L6-CIV-206': { en: 'Lay blinding concrete TR-03', hi: 'ट्रेंच TR-03 ब्लाइंडिंग कंक्रीट लेइंग' },
  'L6-CIV-207': { en: 'Reinforcement bar tying column C-7', hi: 'कॉलम C-7 रीइन्फोर्समेंट बार बाइंडिंग' },
  'L6-CIV-208': { en: 'Formwork erection column C-7', hi: 'कॉलम C-7 फॉर्मवर्क (शटरिंग) इरेक्शन' },
  'L6-CIV-209': { en: 'Excavate pump house pit', hi: 'पंप हाउस गड्ढे की खुदाई' },
  'L6-CIV-210': { en: 'PCC pour pump house base', hi: 'पंप हाउस बेस में PCC कंक्रीट पोर' },
  'L6-CIV-211': { en: 'Grout column bases C-7 to C-10', hi: 'कॉलम बेस C-7 से C-10 ग्राउटिंग' },
  'L6-CIV-212': { en: 'Stormwater drain construction', hi: 'स्टॉर्मवॉटर ड्रेन (नाली) निर्माण' },
  'L6-ELE-301': { en: 'Pull 11kV cable - Substation to MCC', hi: '11kV केबल खींचना - सबस्टेशन से MCC' },
  'L6-ELE-302': { en: 'Install cable tray in MCC building', hi: 'MCC भवन में केबल ट्रे लगाना' },
  'L6-ELE-303': { en: 'Terminate 11kV feeder cable at switchgear', hi: 'स्विचगियर पर 11kV फीडर केबल टर्मिनेशन' },
  'L6-ELE-304': { en: 'Earthing conductor laying Substation', hi: 'सबस्टेशन अर्थिंग कंडक्टर बिछाना' },
  'L6-ELE-305': { en: 'MCC panel positioning ground floor', hi: 'ग्राउंड फ्लोर पर MCC पैनल पोज़िशनिंग' },
  'L6-ELE-306': { en: 'Control cable termination panel A', hi: 'पैनल A पर कंट्रोल केबल टर्मिनेशन' },
  'L6-ELE-307': { en: 'Lighting distribution board LDB-1 install', hi: 'लाइटिंग डिस्ट्रीब्यूशन बोर्ड LDB-1 स्थापना' },
  'L6-ELE-308': { en: 'Install lighting fixtures Substation', hi: 'सबस्टेशन में लाइटिंग फिक्स्चर स्थापना' },
  'L6-ELE-309': { en: 'Terminate motor cable P-101A', hi: 'मोटर केबल P-101A टर्मिनेशन' },
  'L6-ELE-310': { en: 'Testing & commissioning MCC-A', hi: 'MCC-A की टेस्टिंग और कमीशनिंग' },
  'L6-ELE-311': { en: 'Pre-commissioning substation lighting', hi: 'सबस्टेशन लाइटिंग प्री-कमीशनिंग' },
  'L6-ELE-312': { en: 'Final punchlist closeout Electrical', hi: 'इलेक्ट्रिकल अंतिम पंचलिस्ट क्लोज़आउट' },
};

export const translateActivityName = (
  activityId?: string,
  activityName?: string,
  lang: Language = 'en'
): string => {
  if (lang === 'en') return activityName || activityId || '';
  if (activityId && ACTIVITY_TRANSLATIONS[activityId]) {
    return ACTIVITY_TRANSLATIONS[activityId].hi;
  }
  if (!activityName) return activityId || '';

  for (const item of Object.values(ACTIVITY_TRANSLATIONS)) {
    if (item.en.toLowerCase() === activityName.toLowerCase()) {
      return item.hi;
    }
  }

  let translated = activityName;
  const terms: [RegExp, string][] = [
    [/Erect\b/gi, 'इरेक्शन'],
    [/Excavate\b/gi, 'खुदाई'],
    [/Hydrotest\b/gi, 'हाइड्रोपरीक्षण'],
    [/Fit-up\b/gi, 'फिट-अप'],
    [/Install\b/gi, 'स्थापना'],
    [/Weld\b/gi, 'वेल्डिंग'],
    [/Bolt-up\b/gi, 'बोल्टिंग'],
    [/Lay\b/gi, 'बिछाना'],
    [/Cast\b/gi, 'कास्टिंग'],
    [/Backfill\b/gi, 'बैकफ़िलिंग'],
    [/Testing\b/gi, 'टेस्टिंग'],
    [/Commissioning\b/gi, 'कमीशनिंग'],
    [/Grout\b/gi, 'ग्राउटिंग'],
    [/Pull\b/gi, 'खींचना'],
    [/Terminate\b/gi, 'टर्मिनेशन'],
    [/Line (\d+)/gi, 'लाइन $1'],
    [/Unit (\d+)/gi, 'यूनिट $1'],
    [/pipe\b/gi, 'पाइप'],
    [/cable\b/gi, 'केबल'],
    [/footing\b/gi, 'फ़ुटिंग'],
    [/trench\b/gi, 'ट्रेंच'],
    [/column\b/gi, 'कॉलम'],
    [/panel\b/gi, 'पैनल'],
  ];
  for (const [regex, replacement] of terms) {
    translated = translated.replace(regex, replacement);
  }
  return translated;
};

export const translateStatus = (status?: string, lang: Language = 'en'): string => {
  if (!status) return '';
  const norm = status.toUpperCase().replace(/[\s-]+/g, '_');
  if (lang === 'en') {
    switch (norm) {
      case 'COMPLETED': return 'Completed';
      case 'IN_PROGRESS': return 'In Progress';
      case 'DELAYED': return 'Delayed';
      case 'PLANNED': return 'Planned';
      case 'MATCHED': return 'Matched';
      case 'PENDING':
      case 'PENDING_REVIEW': return 'Pending Review';
      case 'REJECTED': return 'Rejected';
      case 'HELD': return 'Held';
      default: return status;
    }
  }
  switch (norm) {
    case 'COMPLETED': return 'पूर्ण';
    case 'IN_PROGRESS': return 'प्रगति पर';
    case 'DELAYED': return 'विलंबित';
    case 'PLANNED': return 'नियोजित';
    case 'MATCHED': return 'मैच हुआ';
    case 'PENDING':
    case 'PENDING_REVIEW': return 'समीक्षा लंबित';
    case 'REJECTED': return 'अस्वीकृत';
    case 'HELD': return 'होल्ड';
    default: return status;
  }
};

export const translateDiscipline = (disc?: string, lang: Language = 'en'): string => {
  if (!disc) return '';
  const norm = disc.toLowerCase();
  if (lang === 'en') {
    return norm.charAt(0).toUpperCase() + norm.slice(1);
  }
  switch (norm) {
    case 'piping': return 'पाइपिंग';
    case 'civil': return 'सिविल';
    case 'electrical': return 'इलेक्ट्रिकल';
    case 'instrumentation': return 'इंस्ट्रुमेंटेशन';
    case 'hse': return 'HSE / सुरक्षा';
    case 'general site':
    case 'general_site': return 'सामान्य साइट';
    default: return disc;
  }
};

export const translateLocation = (loc?: string, lang: Language = 'en'): string => {
  if (!loc) return '';
  if (lang === 'en') return loc;
  const norm = loc.toLowerCase();
  switch (norm) {
    case 'unit 3': return 'यूनिट 3';
    case 'substation': return 'सबस्टेशन';
    case 'tank farm': return 'टैंक फार्म';
    case 'pipeline corridor': return 'पाइपलाइन कॉरिडोर';
    case 'boundary wall': return 'बाउंड्री वॉल';
    default: return loc;
  }
};

export const translateTimeline = (timeline?: string, days?: number, lang: Language = 'en'): string => {
  if (!timeline) return '';
  if (lang === 'en') {
    if (timeline === 'Completed') return 'Completed';
    if (days && days > 0) return `Assigned after ${days} day${days === 1 ? '' : 's'}`;
    return timeline;
  }
  if (timeline === 'Completed') return 'पूर्ण';
  if (days && days > 0) return `${days} दिनों बाद सौंपा जाएगा`;
  if (timeline.includes('Assigned after')) {
    const match = timeline.match(/\d+/);
    if (match) return `${match[0]} दिनों बाद सौंपा जाएगा`;
  }
  if (timeline.includes('Active Now') || timeline.includes('Assigned')) {
    return 'सौंपा गया (अभी सक्रिय)';
  }
  return timeline;
};
