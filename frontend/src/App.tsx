import React, { useState, useEffect } from 'react';
import { 
  Activity, Calendar, Users, FileText, Trash2, 
  CheckCircle, AlertCircle, LogOut, Clock, Download, Heart, Sparkles,
  Video, ExternalLink, Copy, Check, ChevronLeft, ChevronRight,
  Grid, List, Star, MapPin, RefreshCw
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000/api/v1";

interface UserProfile {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface SessionType {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
  capacity: number;
  description: string;
  location_address?: string;
  google_maps_url?: string;
  is_active: boolean;
}

interface Slot {
  id: string;
  start_at: string;
  end_at: string;
  capacity: number;
  booked_count: number;
  status: string;
  session_type_id: string;
}

interface Appointment {
  id: string;
  slot_id: string;
  status: string;
  notes_from_client: string;
  cancellation_reason: string;
  meeting_link?: string;
  meeting_provider?: string;
  mode?: string;
  booked_at: string;
  cancelled_at: string;
  slot: Slot;
  session_type: SessionType;
  doctor_name: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
}

interface Review {
  id: string;
  appointment_id: string;
  client_id: string;
  doctor_id: string;
  rating: number;
  comment?: string;
  is_published: boolean;
  created_at: string;
  client_name: string;
  appointment_date: string;
  session_type_name: string;
}

interface Prescription {
  id: string;
  appointment_id?: string;
  client_id: string;
  diagnosis: string;
  content: {
    vitals: { pulse: string; spo2: string; bp: string; temp: string; weight: string };
    symptoms: string;
    findings: string;
    notes: string;
    medicines: Array<{ name: string; generic: string; frequency: string; duration: string; notes: string }>;
    instructions: string[];
  };
  version: number;
  pdf_url?: string;
  status: string;
  issued_at?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
}

interface Template {
  id: string;
  name: string;
  content: any;
  is_favorite: boolean;
}

interface DoctorProfileData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  specialization: string;
  registration_number: string;
  signature_url?: string;
  picture_url?: string;
  bio?: string;
  linkedin_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  trustpilot_url?: string;
  show_social_links: boolean;
  show_linkedin: boolean;
  show_instagram: boolean;
  show_facebook: boolean;
  show_youtube: boolean;
  show_trustpilot: boolean;
}

interface RegisteredClient {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  alternate_phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  medical_history_summary?: string;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Auth navigation states
  const [isRegister, setIsRegister] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetTokenConfirm, setResetTokenConfirm] = useState(false);
  
  // Form states
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [address, setAddress] = useState("");
  const [medHistory, setMedHistory] = useState("");
  
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetChannel, setResetChannel] = useState<"email" | "phone">("email");


  // Error/Success state
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);

  // Navigation states
  const [currentView, setCurrentView] = useState("home"); // home, book_picker, appointments, prescriptions, doctor_dashboard
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // APPOINTMENT, SESSION, CONFERENCE
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null); // SESSION_PHYSIOTHERAPY, SESSION_YOGA
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType | null>(null);
  
  // Active details
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [openSlots, setOpenSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState("");

  // Client Data lists
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  // Doctor Profile & Social Media Settings
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfileData | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [trustpilotUrl, setTrustpilotUrl] = useState("");
  const [showSocialLinks, setShowSocialLinks] = useState(true);
  const [showLinkedin, setShowLinkedin] = useState(true);
  const [showInstagram, setShowInstagram] = useState(true);
  const [showFacebook, setShowFacebook] = useState(true);
  const [showYoutube, setShowYoutube] = useState(true);
  const [showTrustpilot, setShowTrustpilot] = useState(true);
  const [pictureUrl, setPictureUrl] = useState("");
  const [bioText, setBioText] = useState("");
  const [docSpecialization, setDocSpecialization] = useState("");

  // Client Prescription expanded-preview state
  const [expandedRxId, setExpandedRxId] = useState<string | null>(null);

  // Doctor Setup States
  const [docSessionTypes, setDocSessionTypes] = useState<SessionType[]>([]);
  const [docRules, setDocRules] = useState<any[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]); // Mon-Fri default

  const [docCalendarSlots, setDocCalendarSlots] = useState<Slot[]>([]);
  const [clients, setClients] = useState<RegisteredClient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Doctor Patient Edit States
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [editingClient, setEditingClient] = useState<RegisteredClient | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editClientAltPhone, setEditClientAltPhone] = useState("");
  const [editClientDob, setEditClientDob] = useState("");
  const [editClientGender, setEditClientGender] = useState("Male");
  const [editClientAddress, setEditClientAddress] = useState("");
  const [editClientMedHistory, setEditClientMedHistory] = useState("");
  const [isSavingClientRecord, setIsSavingClientRecord] = useState(false);

  // Doctor Form Add States
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionCat, setNewSessionCat] = useState("SESSION_PHYSIOTHERAPY");
  const [newSessionDur, setNewSessionDur] = useState(30);
  const [newSessionCap, setNewSessionCap] = useState(1);
  const [newSessionDesc, setNewSessionDesc] = useState("");
  const [newSessionLocation, setNewSessionLocation] = useState("Futuristic Wellness Rehab & Yoga Center, 42 Health Boulevard, Suite 300");
  const [newSessionMapUrl, setNewSessionMapUrl] = useState("https://maps.google.com/?q=Futuristic+Wellness+Center");

  // Client booking mode state
  const [bookingMode, setBookingMode] = useState<"Offline" | "Online">("Offline");

  // Doctor Rule Type Mode states (Single Session vs Recurring Availability)
  const [ruleTypeMode, setRuleTypeMode] = useState<"single" | "recurring">("single");
  const [singleRuleDate, setSingleRuleDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [newRuleStart, setNewRuleStart] = useState("09:00");
  const [newRuleEnd, setNewRuleEnd] = useState("13:00");
  const [newRuleSessionType, setNewRuleSessionType] = useState("");
  const [newRuleValidFrom, setNewRuleValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [newRuleValidTo, setNewRuleValidTo] = useState(new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0]);

  const [newExcDate, setNewExcDate] = useState("");
  const [newExcBlocked, setNewExcBlocked] = useState(false);
  const [newExcStart, setNewExcStart] = useState("");
  const [newExcEnd, setNewExcEnd] = useState("");
  const [newExcSessionType, setNewExcSessionType] = useState("");

  // Doctor Prescription Form
  const [rxClient, setRxClient] = useState("");
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [rxShowPreview, setRxShowPreview] = useState<boolean>(true);

  // Doctor/Admin Patient-Wise Prescriptions Management State
  const [doctorPrescriptions, setDoctorPrescriptions] = useState<Prescription[]>([]);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [rxSearchQuery, setRxSearchQuery] = useState<string>("");
  const [editingRxId, setEditingRxId] = useState<string | null>(null);
  const [editingRxVersion, setEditingRxVersion] = useState<number | null>(null);
  const [previewRxModal, setPreviewRxModal] = useState<Prescription | null>(null);

  // Doctor Growth Metrics & Visuals State
  const [metricsStartDate, setMetricsStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [metricsEndDate, setMetricsEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [doctorMetrics, setDoctorMetrics] = useState<any | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const [rxSymptoms, setRxSymptoms] = useState("");
  const [rxFindings, setRxFindings] = useState("");
  const [rxNotes, setRxNotes] = useState("");
  const [rxPulse, setRxPulse] = useState("");
  const [rxSpo2, setRxSpo2] = useState("");
  const [rxBp, setRxBp] = useState("");
  const [rxTemp, setRxTemp] = useState("");
  const [rxWeight, setRxWeight] = useState("");
  const [rxMedicines, setRxMedicines] = useState<any[]>([]);
  const [rxInstructions, setRxInstructions] = useState<string[]>([]);
  const [newInstruction, setNewInstruction] = useState("");
  const [newMedName, setNewMedName] = useState("");
  const [newMedGen, setNewMedGen] = useState("");
  const [newMedFreq, setNewMedFreq] = useState("");
  const [newMedDur, setNewMedDur] = useState("");
  const [newMedNotes, setNewMedNotes] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");

  // Online Meeting Modal & Calendar View States
  const [selectedAppointmentForMeeting, setSelectedAppointmentForMeeting] = useState<Appointment | null>(null);
  const [meetingProvider, setMeetingProvider] = useState<string>("Google Meet");
  const [meetingLinkInput, setMeetingLinkInput] = useState<string>("");
  const [isSavingMeeting, setIsSavingMeeting] = useState<boolean>(false);
  const [copiedApptId, setCopiedApptId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarFilter, setCalendarFilter] = useState<"ONLINE" | "ALL" | "IN_PERSON">("ONLINE");

  const generateDefaultMeetingUrl = (provider: string, apptId: string) => {
    const cleanId = apptId.replace(/-/g, "").toLowerCase();
    if (provider === "Google Meet") {
      const p1 = cleanId.substring(0, 3);
      const p2 = cleanId.substring(3, 7);
      const p3 = cleanId.substring(7, 10);
      return `https://meet.google.com/${p1}-${p2}-${p3}`;
    } else if (provider === "Zoom") {
      const meetingId = Math.abs(cleanId.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)) % 900000000 + 100000000;
      return `https://zoom.us/j/${meetingId}?pwd=FW${cleanId.substring(0, 6).toUpperCase()}`;
    } else if (provider === "Microsoft Teams") {
      return `https://teams.microsoft.com/l/meetup-join/19:online_consultation_${cleanId}@thread.v2/0?context=%7b%22Tid%22:%22futuristic-wellness%22%7d`;
    } else {
      return `https://meet.jit.si/FuturisticWellness-${cleanId.substring(0, 8)}`;
    }
  };

  const handleSaveMeetingLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedAppointmentForMeeting) return;
    
    setIsSavingMeeting(true);
    setErrorMsg("");
    setSuccessMsg("");
    
    try {
      const res = await fetch(`${API_BASE}/appointments/${selectedAppointmentForMeeting.id}/meeting`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          meeting_link: meetingLinkInput,
          meeting_provider: meetingProvider
        })
      });
      
      if (res.ok) {
        const updatedAppt = await res.json();
        setAppointments(prev => prev.map(a => a.id === updatedAppt.id ? updatedAppt : a));
        setSuccessMsg(`Meeting link updated successfully for ${updatedAppt.client_name}`);
        setSelectedAppointmentForMeeting(null);
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to update meeting link");
      }
    } catch (err) {
      setErrorMsg("Network error saving meeting link");
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedApptId(id);
    setTimeout(() => setCopiedApptId(null), 2000);
  };

  const getGoogleCalendarUrl = (app: Appointment) => {
    const start = new Date(app.slot.start_at);
    const end = new Date(app.slot.end_at);
    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const title = encodeURIComponent(`Futuristic Wellness Consultation - ${app.session_type.name}`);
    const details = encodeURIComponent(`Doctor: ${app.doctor_name}\nPatient: ${app.client_name}\nSession: ${app.session_type.name}\nMeeting Link: ${app.meeting_link || 'Pending'}\nNotes: ${app.notes_from_client || 'None'}`);
    const location = encodeURIComponent(app.meeting_link || app.session_type.location_address || "Online Video Call");
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
  };

  const downloadIcsFile = (app: Appointment) => {
    const start = new Date(app.slot.start_at);
    const end = new Date(app.slot.end_at);
    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Futuristic Wellness//EN',
      'BEGIN:VEVENT',
      `UID:${app.id}@futuristicwellness.com`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:Consultation: ${app.session_type.name}`,
      `DESCRIPTION:Doctor: ${app.doctor_name}\\nPatient: ${app.client_name}\\nMeeting Link: ${app.meeting_link || 'None'}`,
      `LOCATION:${app.meeting_link || app.session_type.location_address || 'Online Video'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `appointment-${app.id.substring(0, 8)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Reviews & Testimonials States
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [doctorReviews, setDoctorReviews] = useState<Review[]>([]);
  const [publicReviews, setPublicReviews] = useState<Review[]>([]);
  const [reviewModalAppt, setReviewModalAppt] = useState<Appointment | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [clientReviewFilter, setClientReviewFilter] = useState<"ALL" | "MY_REVIEWS">("ALL");

  useEffect(() => {
    fetchPublicReviews();
    fetchDoctorProfile();
  }, []);

  const fetchPublicReviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/reviews/public`);
      if (res.ok) {
        const data = await res.json();
        setPublicReviews(data);
      }
    } catch (e) {}
  };

  const fetchMyReviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/reviews/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyReviews(data);
      }
    } catch (e) {}
  };

  const fetchDoctorReviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/reviews/doctor`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctorReviews(data);
      }
    } catch (e) {}
  };

  const fetchDoctorMetrics = async (start?: string, end?: string) => {
    setIsLoadingMetrics(true);
    const s = start !== undefined ? start : metricsStartDate;
    const e = end !== undefined ? end : metricsEndDate;
    try {
      const res = await fetch(`${API_BASE}/doctor/metrics?start_date=${s}&end_date=${e}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctorMetrics(data);
      }
    } catch (err) {
      console.error("Error fetching growth metrics:", err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const handleConvertAppointmentToOnline = async (appId: string) => {
    try {
      const res = await fetch(`${API_BASE}/appointments/${appId}/mode`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ mode: "ONLINE" })
      });
      if (res.ok) {
        const updatedApp = await res.json();
        setSuccessMsg("Appointment converted to ONLINE meeting successfully! You can now attach or generate meeting links.");
        fetchClientAppointments();
        fetchDoctorMetrics();
        setSelectedAppointmentForMeeting(updatedApp);
        setMeetingProvider(updatedApp.meeting_provider || "Google Meet");
        setMeetingLinkInput(updatedApp.meeting_link || generateDefaultMeetingUrl("Google Meet", updatedApp.id));
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to convert appointment mode.");
      }
    } catch (e) {
      setErrorMsg("Network error converting appointment mode");
    }
  };

  const handleSaveReview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!reviewModalAppt) return;
    setIsSubmittingReview(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          appointment_id: reviewModalAppt.id,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      if (res.ok) {
        setSuccessMsg("Thank you! Your review has been saved.");
        setReviewModalAppt(null);
        setReviewComment("");
        setReviewRating(5);
        fetchMyReviews();
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to save review");
      }
    } catch (e) {
      setErrorMsg("Network error submitting review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleToggleReviewPublished = async (reviewId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}/publish`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ is_published: !currentStatus })
      });
      if (res.ok) {
        fetchDoctorReviews();
        fetchPublicReviews();
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setUser(null);
    }
  }, [token]);

  // Fetch client or doctor specific data
  useEffect(() => {
    if (user) {
      fetchDoctorProfile();
      fetchPublicReviews();
      if (user.role === "CLIENT") {
        fetchClientAppointments();
        fetchClientPrescriptions();
        fetchMyReviews();
      } else if (user.role === "DOCTOR" || user.role === "ADMIN") {
        fetchDoctorSessionTypes();
        fetchDoctorRules();
        fetchDoctorSlotsCalendar();
        fetchTemplates();
        fetchRegisteredClients();
        fetchClientAppointments();
        fetchDoctorReviews();
        fetchDoctorMetrics();
        fetchDoctorPrescriptions();
      }
    }
  }, [user]);

  const fetchDoctorProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/doctor`);
      if (res.ok) {
        const data: DoctorProfileData = await res.json();
        setDoctorProfile(data);
        setLinkedinUrl(data.linkedin_url || "");
        setInstagramUrl(data.instagram_url || "");
        setFacebookUrl(data.facebook_url || "");
        setYoutubeUrl(data.youtube_url || "");
        setTrustpilotUrl(data.trustpilot_url || "");
        setShowSocialLinks(data.show_social_links !== false);
        setShowLinkedin(data.show_linkedin !== false);
        setShowInstagram(data.show_instagram !== false);
        setShowFacebook(data.show_facebook !== false);
        setShowYoutube(data.show_youtube !== false);
        setShowTrustpilot(data.show_trustpilot !== false);
        setPictureUrl(data.picture_url || "/static/uploads/doctor_default.png");
        setBioText(data.bio || "");
        setDocSpecialization(data.specialization || "");
      }
    } catch (e) {}
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        throw new Error("Failed to fetch user profile");
      }
    } catch (e) {
      setToken(null);
      localStorage.removeItem("token");
    }
  };

  const fetchClientAppointments = async () => {
    try {
      const res = await fetch(`${API_BASE}/appointments/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (e) {}
  };

  const fetchClientPrescriptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/prescriptions/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPrescriptions(data);
      }
    } catch (e) {}
  };

  const fetchDoctorPrescriptions = async (patientId?: string) => {
    try {
      const pid = patientId !== undefined ? patientId : selectedPatientFilter;
      const url = `${API_BASE}/prescriptions/doctor${pid ? `?client_id=${pid}` : ''}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctorPrescriptions(data);
      }
    } catch (e) {}
  };

  // Doctor Action: Load prescription into editor for editing & resaving
  const handleEditPrescription = (rx: Prescription) => {
    setEditingRxId(rx.id);
    setEditingRxVersion(rx.version);
    setRxClient(rx.client_id || "");
    setRxDiagnosis(rx.diagnosis || "");
    setRxSymptoms(rx.content?.symptoms || "");
    setRxFindings(rx.content?.findings || "");
    setRxNotes(rx.content?.notes || "");
    setRxPulse(rx.content?.vitals?.pulse || "");
    setRxSpo2(rx.content?.vitals?.spo2 || "");
    setRxBp(rx.content?.vitals?.bp || "");
    setRxTemp(rx.content?.vitals?.temp || "");
    setRxWeight(rx.content?.vitals?.weight || "");
    setRxMedicines(rx.content?.medicines || []);
    setRxInstructions(rx.content?.instructions || []);

    const el = document.getElementById("rx-editor-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Doctor Action: Cancel Editing Mode
  const handleCancelEdit = () => {
    setEditingRxId(null);
    setEditingRxVersion(null);
    setRxClient("");
    setRxDiagnosis("");
    setRxSymptoms("");
    setRxFindings("");
    setRxNotes("");
    setRxPulse("");
    setRxSpo2("");
    setRxBp("");
    setRxTemp("");
    setRxWeight("");
    setRxMedicines([]);
    setRxInstructions([]);
  };

  // Doctor Action: Delete prescription
  const handleDeletePrescription = async (rxId: string) => {
    if (!window.confirm("Are you sure you want to delete this prescription? This action cannot be undone.")) {
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/prescriptions/${rxId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg("🗑️ Prescription deleted successfully.");
        fetchDoctorPrescriptions(selectedPatientFilter);
        if (editingRxId === rxId) {
          handleCancelEdit();
        }
      } else {
        const data = await res.json();
        throw new Error(data.detail || "Failed to delete prescription.");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const fetchDoctorSessionTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/doctor/session-types`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocSessionTypes(data);
      }
    } catch (e) {}
  };

  const fetchDoctorRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/doctor/availability-rules`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocRules(data);
      }
    } catch (e) {}
  };

  const fetchDoctorSlotsCalendar = async () => {
    try {
      const res = await fetch(`${API_BASE}/doctor/availability`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocCalendarSlots(data);
      }
    } catch (e) {}
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/prescriptions/templates`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (e) {}
  };

  const fetchRegisteredClients = async () => {
    try {
      const res = await fetch(`${API_BASE}/doctor/clients`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {}
  };

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed");
      }
      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setBookingSuccessMessage(null); // Clear booking message on login
      setCurrentView("home");
      setPassword("");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          alternate_phone: alternatePhone || null,
          full_name: fullName,
          password,
          date_of_birth: dob || null,
          gender,
          address: address || null,
          medical_history_summary: medHistory || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Registration failed");
      }
      setSuccessMsg("Registration successful! Welcome email sent. Please log in.");
      setIsRegister(false);
      setPassword("");
      setAlternatePhone("");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSelectClientForEdit = (client: RegisteredClient) => {
    setEditingClient(client);
    setEditClientName(client.full_name || "");
    setEditClientEmail(client.email || "");
    setEditClientPhone(client.phone || "");
    setEditClientAltPhone(client.alternate_phone || "");
    setEditClientDob(client.date_of_birth || "");
    setEditClientGender(client.gender || "Male");
    setEditClientAddress(client.address || "");
    setEditClientMedHistory(client.medical_history_summary || "");
  };

  const handleSaveClientRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setIsSavingClientRecord(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/doctor/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: editClientName,
          email: editClientEmail,
          phone: editClientPhone,
          alternate_phone: editClientAltPhone || null,
          date_of_birth: editClientDob || null,
          gender: editClientGender,
          address: editClientAddress || null,
          medical_history_summary: editClientMedHistory || null
        })
      });
      const data: RegisteredClient = await res.json();
      if (!res.ok) {
        throw new Error((data as any).detail || "Failed to update patient record.");
      }
      setSuccessMsg(`Patient details for '${data.full_name}' successfully updated in database!`);
      fetchRegisteredClients();
      setEditingClient(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSavingClientRecord(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: resetIdentifier, channel: resetChannel })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.reset_code) {
          setResetToken(data.reset_code);
          setSuccessMsg(`6-digit OTP Code generated (${data.reset_code}) & sent via ${data.channel?.toUpperCase() || resetChannel.toUpperCase()}.`);
        } else {
          setSuccessMsg(data.message || `If an account matches, a 6-digit OTP code has been sent via ${resetChannel.toUpperCase()}.`);
        }
        setResetTokenConfirm(true);
      } else {
        setErrorMsg(data.detail || "Failed to request password reset OTP.");
      }
    } catch (err: any) {
      setErrorMsg("Failed to request reset OTP.");
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: resetIdentifier,
          otp: resetToken,
          token: resetToken,
          new_password: resetNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to confirm password reset.");
      }
      setSuccessMsg("Password reset successfully! You can now log in with your new password.");
      setForgotPassword(false);
      setResetTokenConfirm(false);
      setResetToken("");
      setResetNewPassword("");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };


  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setBookingSuccessMessage(null);
    setErrorMsg("");
    setSuccessMsg("");
    setCurrentView("home");
  };

  // Client booking flows
  const selectCardCategory = async (cat: string) => {
    setSelectedCategory(cat);
    setSelectedSubCategory(null);
    setSelectedSessionType(null);
    setOpenSlots([]);
    setSelectedSlot(null);
    
    // Fetch session types
    try {
      const res = await fetch(`${API_BASE}/doctor/session-types`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data: SessionType[] = await res.json();
        if (cat === "SESSION_PHYSIOTHERAPY") {
          // Strictly physiotherapy - exclude any yoga session types
          const filtered = data.filter(st => {
            const isPhysioCat = st.category === "SESSION_PHYSIOTHERAPY" || st.category === "APPOINTMENT";
            const isYogaName = st.name.toLowerCase().includes("yoga");
            return isPhysioCat && !isYogaName;
          });
          setSessionTypes(filtered);
        } else if (cat === "SESSION_YOGA") {
          // Strictly yoga sessions
          const filtered = data.filter(st => st.category === "SESSION_YOGA" || st.name.toLowerCase().includes("yoga"));
          setSessionTypes(filtered);
        } else {
          const filtered = data.filter(st => st.category === cat);
          setSessionTypes(filtered);
        }
      }
    } catch (e) {}
    
    setCurrentView("book_picker");
  };

  const selectSubCategoryFilter = async (subCat: string) => {
    setSelectedSubCategory(subCat);
    setSelectedSessionType(null);
    setOpenSlots([]);
    setSelectedSlot(null);

    try {
      const res = await fetch(`${API_BASE}/doctor/session-types?category=${subCat}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessionTypes(data);
      }
    } catch (e) {}
  };

  const loadSlotsForSessionType = async (st: SessionType) => {
    setSelectedSessionType(st);
    setSelectedSlot(null);
    const today = new Date().toISOString().split('T')[0];
    const oneMonthLater = new Date();
    oneMonthLater.setDate(oneMonthLater.getDate() + 30); // 1 month maximum window
    const end = oneMonthLater.toISOString().split('T')[0];

    try {
      const res = await fetch(`${API_BASE}/doctor/slots?session_type_id=${st.id}&from_date=${today}&to_date=${end}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data: Slot[] = await res.json();
        
        // Enforce 3-hour minimum lead time from current datetime
        const now = new Date();
        const minLeadTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);

        const validSlots = data.filter(slot => {
          const slotStart = new Date(slot.start_at);
          return slotStart >= minLeadTime;
        });

        setOpenSlots(validSlots);
      }
    } catch (e) {}
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    setErrorMsg("");
    setSuccessMsg("");

    const isPhysioSession = selectedSessionType?.category === "SESSION_PHYSIOTHERAPY" || 
                            selectedSessionType?.category === "APPOINTMENT" || 
                            selectedSessionType?.name.toLowerCase().includes("physio") ||
                            selectedCategory === "SESSION_PHYSIOTHERAPY";

    let finalNotes = notes;
    if (isPhysioSession) {
      const modeText = `[Session Mode: ${bookingMode === 'Online' ? 'Online (Video Consultation)' : 'Offline (In-Person Clinic)'}]`;
      finalNotes = notes ? `${modeText} ${notes}` : modeText;
    }

    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          notes_from_client: finalNotes,
          mode: bookingMode === 'Offline' ? 'OFFLINE' : 'ONLINE'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Booking failed.");
      }
      const welcomeMessageText = "We're so glad you're here! 🎉 Taking care of your body is the best gift you can give yourself. We're excited to support your recovery every step of the way.";
      setSuccessMsg(welcomeMessageText);
      setBookingSuccessMessage(welcomeMessageText);
      fetchClientAppointments();
      setCurrentView("appointments");
      setSelectedSlot(null);
      setNotes("");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCancelAppointment = async (appId: string) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/appointments/${appId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Cancellation failed.");
      }
      setSuccessMsg("Appointment cancelled successfully! Dual cancellation emails sent.");
      fetchClientAppointments();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Prescription PDF download helper
  const handleDownloadPrescription = async (prescriptionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/prescriptions/${prescriptionId}/download`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error("Unable to download prescription.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prescription_${prescriptionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Doctor Action: Setup Session Types
  const handleCreateSessionType = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/doctor/session-types`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSessionName,
          category: newSessionCat,
          duration_minutes: newSessionDur,
          capacity: newSessionCap,
          description: newSessionDesc || null,
          location_address: newSessionLocation || null,
          google_maps_url: newSessionMapUrl || null
        })
      });
      if (res.ok) {
        setSuccessMsg("Session type created successfully.");
        fetchDoctorSessionTypes();
        setNewSessionName("");
        setNewSessionDesc("");
      }
    } catch (e) {}
  };

  // Doctor Action: Save Doctor Profile, Picture, Bio/Introduction & Social Links
  const handleSaveDoctorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/doctor/profile`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          specialization: docSpecialization || null,
          picture_url: pictureUrl || null,
          bio: bioText || null,
          linkedin_url: linkedinUrl || null,
          instagram_url: instagramUrl || null,
          facebook_url: facebookUrl || null,
          youtube_url: youtubeUrl || null,
          trustpilot_url: trustpilotUrl || null,
          show_social_links: showSocialLinks,
          show_linkedin: showLinkedin,
          show_instagram: showInstagram,
          show_facebook: showFacebook,
          show_youtube: showYoutube,
          show_trustpilot: showTrustpilot
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update doctor profile.");
      }
      setDoctorProfile(data);
      setSuccessMsg("Doctor profile picture, bio & individual social handle activation settings updated successfully!");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Doctor Action: Delete Single Session Type
  const handleDeleteSessionType = async (stId: string) => {
    if (!window.confirm("Are you sure you want to delete this service type?")) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/doctor/session-types/${stId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to delete service.");
      }
      setSuccessMsg(data.message || "Service deleted successfully.");
      fetchDoctorSessionTypes();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Doctor Action: Shortcut to Delete All Created Services
  const handleDeleteAllSessionTypes = async () => {
    if (!window.confirm("Are you sure you want to delete all created services? Note: Services with active client bookings will be preserved.")) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/doctor/session-types`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to delete services.");
      }
      setSuccessMsg(data.message);
      fetchDoctorSessionTypes();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Doctor Action: Shortcut to Cancel All Active Availability
  const handleCancelAllAvailability = async () => {
    if (!window.confirm("Are you sure you want to cancel all current active availability? Any availability time slot where a client has booked their appointment will be strictly preserved.")) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/doctor/availability/cancel-all`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to cancel availability.");
      }
      setSuccessMsg(data.message);
      fetchDoctorRules();
      fetchDoctorSlotsCalendar();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Doctor Action: Delete Availability Rule
  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`${API_BASE}/doctor/availability-rules/${ruleId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg("Availability rule removed and open calendar updated.");
        fetchDoctorRules();
        fetchDoctorSlotsCalendar();
      }
    } catch (e) {}
  };

  // Doctor Action: Create Availability Rules (Single Session or Recurring)
  const handleCreateBulkRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!newRuleSessionType) {
      setErrorMsg("Please select a service type.");
      return;
    }

    let daysToApply = selectedDays;
    let validFromStr = newRuleValidFrom;
    let validToStr = newRuleValidTo;

    if (ruleTypeMode === "single") {
      if (!singleRuleDate) {
        setErrorMsg("Please select a date for the session.");
        return;
      }
      validFromStr = singleRuleDate;
      validToStr = singleRuleDate;
      const dt = new Date(singleRuleDate + "T00:00:00");
      const jsDay = dt.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const pythonDay = (jsDay + 6) % 7; // 0=Mon, 1=Tue, ..., 6=Sun
      daysToApply = [pythonDay];
    } else {
      if (selectedDays.length === 0) {
        setErrorMsg("Please select at least one day of the week.");
        return;
      }
    }

    try {
      const formattedStart = newRuleStart.length === 5 ? `${newRuleStart}:00` : newRuleStart;
      const formattedEnd = newRuleEnd.length === 5 ? `${newRuleEnd}:00` : newRuleEnd;

      const res = await fetch(`${API_BASE}/doctor/availability-rules/bulk`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          days_of_week: daysToApply,
          start_time: formattedStart,
          end_time: formattedEnd,
          session_type_id: newRuleSessionType,
          valid_from: validFromStr,
          valid_to: validToStr
        })
      });
      if (res.ok) {
        const msg = ruleTypeMode === "single"
          ? `Single session slot created for ${singleRuleDate} (${newRuleStart} - ${newRuleEnd})!`
          : `Availability rule successfully applied to ${daysToApply.length} days! Open slots materialized for patients.`;
        setSuccessMsg(msg);
        fetchDoctorRules();
        fetchDoctorSlotsCalendar();
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || "Failed to create rules");
      }
    } catch (e) {}
  };

  // Doctor Action: Create Availability Exception
  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/doctor/availability-exceptions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          session_type_id: newExcSessionType || null,
          date: newExcDate,
          is_blocked: newExcBlocked,
          start_time: newExcStart ? `${newExcStart}:00` : null,
          end_time: newExcEnd ? `${newExcEnd}:00` : null
        })
      });
      if (res.ok) {
        setSuccessMsg("Exception added. Availability calendar updated.");
        fetchDoctorSlotsCalendar();
        setNewExcDate("");
      }
    } catch (e) {}
  };

  // Doctor Action: Add medicine row to editor
  const handleAddMedicineRow = () => {
    if (!newMedName) return;
    setRxMedicines([...rxMedicines, {
      name: newMedName,
      generic: newMedGen,
      frequency: newMedFreq,
      duration: newMedDur,
      notes: newMedNotes
    }]);
    setNewMedName("");
    setNewMedGen("");
    setNewMedFreq("");
    setNewMedDur("");
    setNewMedNotes("");
  };

  const handleRemoveMedicineRow = (index: number) => {
    setRxMedicines(rxMedicines.filter((_, i) => i !== index));
  };

  // Doctor Action: Add general instruction row
  const handleAddInstructionRow = () => {
    if (!newInstruction) return;
    setRxInstructions([...rxInstructions, newInstruction]);
    setNewInstruction("");
  };

  const handleRemoveInstructionRow = (index: number) => {
    setRxInstructions(rxInstructions.filter((_, i) => i !== index));
  };

  // Load prescription template data
  const handleLoadTemplate = (temp: Template) => {
    const cont = temp.content;
    setRxDiagnosis(cont.diagnosis || "");
    setRxSymptoms(cont.symptoms || "");
    setRxFindings(cont.findings || "");
    setRxNotes(cont.notes || "");
    setRxPulse(cont.vitals?.pulse || "");
    setRxSpo2(cont.vitals?.spo2 || "");
    setRxBp(cont.vitals?.bp || "");
    setRxTemp(cont.vitals?.temp || "");
    setRxWeight(cont.vitals?.weight || "");
    setRxMedicines(cont.medicines || []);
    setRxInstructions(cont.instructions || []);
  };

  // Doctor Action: Save Template
  const handleSaveAsTemplate = async () => {
    if (!newTemplateName) {
      alert("Please provide a template name.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/prescriptions/templates`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTemplateName,
          content: {
            vitals: { pulse: rxPulse, spo2: rxSpo2, bp: rxBp, temp: rxTemp, weight: rxWeight },
            symptoms: rxSymptoms,
            findings: rxFindings,
            notes: rxNotes,
            diagnosis: rxDiagnosis,
            medicines: rxMedicines,
            instructions: rxInstructions
          },
          is_favorite: true
        })
      });
      if (res.ok) {
        alert("Template saved successfully.");
        fetchTemplates();
        setNewTemplateName("");
      }
    } catch (e) {}
  };

  // Doctor Action: Submit or Resave prescription (DRAFT or FINALIZED)
  const handleCreatePrescription = async (statusVal: string) => {
    if (!rxClient) {
      alert("Please select a client.");
      return;
    }
    if (!rxDiagnosis.trim()) {
      alert("Please enter a diagnosis.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    if (statusVal === "FINALIZED") setIsGeneratingPdf(true);
    try {
      if (editingRxId) {
        // EDIT EXISTING PRESCRIPTION
        const res = await fetch(`${API_BASE}/prescriptions/${editingRxId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            client_id: rxClient,
            diagnosis: rxDiagnosis,
            content: {
              vitals: { pulse: rxPulse, spo2: rxSpo2, bp: rxBp, temp: rxTemp, weight: rxWeight },
              symptoms: rxSymptoms,
              findings: rxFindings,
              notes: rxNotes,
              diagnosis: rxDiagnosis,
              medicines: rxMedicines,
              instructions: rxInstructions
            },
            status: statusVal
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Update failed.");

        if (statusVal === "FINALIZED") {
          setSuccessMsg("✅ Prescription resaved & PDF re-finalized! Patient record updated.");
        } else {
          setSuccessMsg("📋 Prescription draft updated & resaved.");
        }
        fetchDoctorPrescriptions(selectedPatientFilter);
        handleCancelEdit();
      } else {
        // CREATE NEW PRESCRIPTION
        const res = await fetch(`${API_BASE}/prescriptions`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            client_id: rxClient,
            diagnosis: rxDiagnosis,
            content: {
              vitals: { pulse: rxPulse, spo2: rxSpo2, bp: rxBp, temp: rxTemp, weight: rxWeight },
              symptoms: rxSymptoms,
              findings: rxFindings,
              notes: rxNotes,
              diagnosis: rxDiagnosis,
              medicines: rxMedicines,
              instructions: rxInstructions
            },
            status: "DRAFT"
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Creation failed.");

        if (statusVal === "FINALIZED") {
          const finRes = await fetch(`${API_BASE}/prescriptions/${data.id}/finalize`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (finRes.ok) {
            setSuccessMsg("✅ Prescription finalized & PDF saved to patient's record! The client can now view & download it from their Prescriptions tab. Email notification sent.");
          } else {
            const errData = await finRes.json();
            throw new Error(errData.detail || "Finalize / PDF render process failed.");
          }
        } else {
          setSuccessMsg("📋 Prescription draft saved successfully to database.");
        }
        fetchDoctorPrescriptions(selectedPatientFilter);

        // Reset Form
        setRxClient("");
        setRxDiagnosis("");
        setRxSymptoms("");
        setRxFindings("");
        setRxNotes("");
        setRxPulse("");
        setRxSpo2("");
        setRxBp("");
        setRxTemp("");
        setRxWeight("");
        setRxMedicines([]);
        setRxInstructions([]);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Helper check if cancel button is disabled (< 1 hour remaining)
  const isCancelDisabled = (slotStart: string) => {
    const start = new Date(slotStart).getTime();
    const now = new Date().getTime();
    return start - now < 60 * 60 * 1000; // < 1 hour in ms
  };

  // JSX views
  return (
    <div className="app-container">
      {/* Navbar */}
      <header className="navbar">
        <div className="navbar-brand">
          <Activity size={28} />
          <span>Futuristic Wellness</span>
        </div>
        {token && (
          <nav className="navbar-menu">
            {user?.role === "CLIENT" && (
              <>
                <button className={`nav-link btn-link ${currentView === 'home' ? 'active' : ''}`} onClick={() => setCurrentView("home")}>Dashboard</button>
                <button className={`nav-link btn-link ${currentView === 'appointments' ? 'active' : ''}`} onClick={() => setCurrentView("appointments")}>My Appointments</button>
                <button className={`nav-link btn-link ${currentView === 'prescriptions' ? 'active' : ''}`} onClick={() => setCurrentView("prescriptions")}>Prescriptions</button>
              </>
            )}

            {user?.role === "DOCTOR" && (
              <>
                <button className={`nav-link btn-link ${currentView === 'home' || currentView === 'doctor_dashboard' ? 'active' : ''}`} onClick={() => setCurrentView("home")}>
                  📊 Doctor Dashboard
                </button>
                <button className={`nav-link btn-link ${currentView === 'doctor_metrics' ? 'active' : ''}`} onClick={() => { setCurrentView("doctor_metrics"); fetchDoctorMetrics(); }}>
                  📈 Visuals &amp; Growth Metrics
                </button>
                <button className={`nav-link btn-link ${currentView === 'doctor_setup' ? 'active' : ''}`} onClick={() => setCurrentView("doctor_setup")}>
                  ⚙️ Doctor Setup &amp; Settings
                </button>
              </>
            )}

            <button className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </nav>
        )}
      </header>

      <main className="main-content">
        {/* Alerts */}
        {errorMsg && (
          <div className="alert alert-danger fade-in">
            <AlertCircle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success fade-in">
            <CheckCircle size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* POST-BOOKING WELCOME & ENCOURAGEMENT BANNER FOR CLIENTS */}
        {token && user?.role === "CLIENT" && bookingSuccessMessage && (
          <div className="card fade-in" style={{ 
            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.12) 0%, rgba(13, 148, 136, 0.22) 100%)', 
            border: '2px solid var(--color-primary)', 
            padding: '24px', 
            borderRadius: '16px', 
            marginBottom: '24px',
            position: 'relative',
            boxShadow: '0 8px 24px rgba(20, 184, 166, 0.20)'
          }}>
            <button 
              type="button" 
              className="btn-link" 
              style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '18px', color: 'var(--color-primary-text)', fontWeight: 'bold' }}
              onClick={() => setBookingSuccessMessage(null)}
              title="Close message"
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ fontSize: '38px', lineHeight: 1, flexShrink: 0 }}>🎉</div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', color: 'var(--color-primary-text)', fontSize: '18px', fontWeight: 800 }}>
                  Booking Confirmed! Welcome to Futuristic Wellness
                </h3>
                <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-main)', lineHeight: '1.6', fontWeight: 500 }}>
                  {bookingSuccessMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LOGIN / SIGNUP FLOW WITH DOCTOR SPOTLIGHT */}
        {!token && (
          <div className="fade-in" style={{ maxWidth: '1020px', margin: '30px auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>
            
            {/* DOCTOR PICTURE & INTRODUCTION SPOTLIGHT CARD */}
            <div className="card" style={{ padding: '30px', borderTop: '4px solid var(--color-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ 
                position: 'relative', 
                width: '140px', 
                height: '140px', 
                borderRadius: '50%', 
                overflow: 'hidden', 
                marginBottom: '16px',
                boxShadow: '0 8px 24px rgba(20, 184, 166, 0.25)',
                border: '4px solid var(--color-bg-surface)',
                background: 'var(--color-bg-surface-alt)'
              }}>
                <img 
                  src={doctorProfile?.picture_url || "/static/uploads/doctor_default.png"} 
                  alt={doctorProfile?.full_name || "Doctor Profile"} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/doctor_default.png";
                  }}
                />
              </div>

              <h2 style={{ fontSize: '22px', color: 'var(--color-primary-text)', fontWeight: 800, margin: '0 0 4px 0' }}>
                {doctorProfile?.full_name || "Dr. Sarah Jenkins"}
              </h2>

              <p style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '14.5px', margin: '0 0 10px 0' }}>
                {doctorProfile?.specialization || "Senior Physiotherapist & Wellness Specialist"}
              </p>

              <span style={{ 
                background: 'var(--color-bg-surface-alt)', 
                border: '1px solid var(--color-border)', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '12px', 
                color: 'var(--color-text-muted)',
                fontWeight: 600,
                marginBottom: '18px'
              }}>
                Registration No: {doctorProfile?.registration_number || "REG-984210"}
              </span>

              {/* Doctor Introduction / Bio */}
              <div style={{ 
                background: 'rgba(20, 184, 166, 0.06)', 
                borderRadius: '12px', 
                padding: '16px', 
                textAlign: 'left',
                width: '100%',
                borderLeft: '4px solid var(--color-primary)',
                marginBottom: '18px'
              }}>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary-text)', fontWeight: 700, margin: '0 0 6px 0' }}>
                  Doctor Introduction
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--color-text-main)', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                  "{doctorProfile?.bio || "Dedicated to restoring physical well-being through specialized manual and movement therapy. Welcome to Futuristic Wellness!"}"
                </p>
              </div>

              {/* Social Media Hyperlinks (Renders only individually activated handles) */}
              {doctorProfile?.show_social_links !== false && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {doctorProfile?.show_linkedin !== false && doctorProfile?.linkedin_url && (
                    <a href={doctorProfile.linkedin_url.startsWith('http') ? doctorProfile.linkedin_url : `https://${doctorProfile.linkedin_url}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '4px 10px' }}>🔗 LinkedIn</a>
                  )}
                  {doctorProfile?.show_instagram !== false && doctorProfile?.instagram_url && (
                    <a href={doctorProfile.instagram_url.startsWith('http') ? doctorProfile.instagram_url : `https://${doctorProfile.instagram_url}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '4px 10px' }}>📸 Instagram</a>
                  )}
                  {doctorProfile?.show_facebook !== false && doctorProfile?.facebook_url && (
                    <a href={doctorProfile.facebook_url.startsWith('http') ? doctorProfile.facebook_url : `https://${doctorProfile.facebook_url}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '4px 10px' }}>📘 Facebook</a>
                  )}
                  {doctorProfile?.show_youtube !== false && doctorProfile?.youtube_url && (
                    <a href={doctorProfile.youtube_url.startsWith('http') ? doctorProfile.youtube_url : `https://${doctorProfile.youtube_url}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '4px 10px' }}>▶️ YouTube</a>
                  )}
                  {doctorProfile?.show_trustpilot !== false && doctorProfile?.trustpilot_url && (
                    <a href={doctorProfile.trustpilot_url.startsWith('http') ? doctorProfile.trustpilot_url : `https://${doctorProfile.trustpilot_url}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '4px 10px' }}>⭐ TrustPilot</a>
                  )}
                </div>
              )}
            </div>

            {/* LOGIN / SIGNUP CARD */}
            <div className="card" style={{ padding: '30px' }}>
              {forgotPassword ? (
                // Forgot Password Dialog
                <form onSubmit={resetTokenConfirm ? handleResetConfirm : handleResetRequest} className="fade-in">
                  <h2 style={{ marginBottom: '6px', color: 'var(--color-primary-text)', fontWeight: 800 }}>🔐 Reset Password via OTP</h2>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                    Available for all Client, Patient, Customer, and Doctor accounts. Receive a 6-digit OTP via Email or Phone SMS.
                  </p>

                  {!resetTokenConfirm ? (
                    <>
                      <div style={{ marginBottom: '18px' }}>
                        <label className="form-label" style={{ marginBottom: '8px', display: 'block', fontWeight: 600 }}>
                          Select OTP Channel:
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <button
                            type="button"
                            className={`btn ${resetChannel === 'email' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                              padding: '10px 14px',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              borderRadius: '8px',
                              fontWeight: resetChannel === 'email' ? 700 : 500
                            }}
                            onClick={() => setResetChannel('email')}
                          >
                            📧 Email OTP
                          </button>
                          <button
                            type="button"
                            className={`btn ${resetChannel === 'phone' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                              padding: '10px 14px',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              borderRadius: '8px',
                              fontWeight: resetChannel === 'phone' ? 700 : 500
                            }}
                            onClick={() => setResetChannel('phone')}
                          >
                            📱 Phone SMS OTP
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          {resetChannel === 'email' ? 'Registered Email Address' : 'Registered Phone Number'}
                        </label>
                        <input
                          type={resetChannel === 'email' ? 'email' : 'text'}
                          className="form-input"
                          placeholder={
                            resetChannel === 'email'
                              ? 'e.g. doctor@wellness.com or client@example.com'
                              : 'e.g. +1000000000 or +919876543210'
                          }
                          required
                          value={resetIdentifier}
                          onChange={e => setResetIdentifier(e.target.value)}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '6px' }}>
                        {resetChannel === 'email' ? '📩 Send OTP to Email' : '📱 Send OTP to Phone SMS'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{
                        padding: '12px 14px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        marginBottom: '16px',
                        color: 'var(--color-primary-text)'
                      }}>
                        ✨ 6-digit OTP code sent via <strong>{resetChannel.toUpperCase()}</strong> to <strong>{resetIdentifier}</strong>.
                      </div>

                      <div className="form-group">
                        <label className="form-label">6-Digit OTP Verification Code</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          maxLength={6}
                          placeholder="Enter 6-digit OTP (e.g. 482910)"
                          style={{ letterSpacing: '4px', fontSize: '16px', fontWeight: 700, textAlign: 'center' }}
                          value={resetToken}
                          onChange={e => setResetToken(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">New Password</label>
                        <input
                          type="password"
                          className="form-input"
                          required
                          minLength={6}
                          placeholder="Enter new password (min. 6 characters)"
                          value={resetNewPassword}
                          onChange={e => setResetNewPassword(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '6px' }}>
                        🔒 Set New Password &amp; Log In
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        style={{ width: '100%', textAlign: 'center', marginTop: '12px', fontSize: '13px' }}
                        onClick={() => setResetTokenConfirm(false)}
                      >
                        🔄 Change Channel or Resend OTP
                      </button>
                    </>
                  )}
                  
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '12px' }}
                    onClick={() => {
                      setForgotPassword(false);
                      setResetTokenConfirm(false);
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                  >
                    ← Back to Login
                  </button>
                </form>
              ) : isRegister ? (
                // Register Client Form
                <form onSubmit={handleRegister} className="fade-in">
                  <h2 style={{ marginBottom: '20px', color: 'var(--color-primary-text)', fontWeight: 800 }}>Create Wellness Account</h2>
                  
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" required value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Primary Mobile Phone (E.164 format, e.g. +1234567890)</label>
                    <input type="text" className="form-input" required placeholder="+1234567890" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Alternate Calling / WhatsApp Number (Optional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. +1987654321 (If different for calling or WhatsApp)" 
                      value={alternatePhone} 
                      onChange={e => setAlternatePhone(e.target.value)} 
                    />
                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                      💡 Optional: Provide if you use a separate number for voice calls vs WhatsApp.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-input" required value={password} onChange={e => setPassword(e.target.value)} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Date of Birth</label>
                      <input type="date" className="form-input" value={dob} onChange={e => setDob(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gender</label>
                      <select className="form-select" value={gender} onChange={e => setGender(e.target.value)}>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Home Address</label>
                    <input type="text" className="form-input" value={address} onChange={e => setAddress(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Medical History Summary</label>
                    <textarea className="form-textarea" rows={3} placeholder="Allergies, chronic conditions..." value={medHistory} onChange={e => setMedHistory(e.target.value)} />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Register Account</button>
                  <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                    Already have an account? <button type="button" className="btn-link" style={{ color: 'var(--color-primary)', fontWeight: 600 }} onClick={() => setIsRegister(false)}>Login</button>
                  </p>
                </form>
              ) : (
                // Login Form
                <form onSubmit={handleLogin} className="fade-in">
                  <h2 style={{ marginBottom: '6px', color: 'var(--color-primary-text)', fontWeight: 800 }}>Welcome Back</h2>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '15px' }}>Care that fits your life.</p>
                  
                  <div className="form-group">
                    <label className="form-label">Email or Phone Number</label>
                    <input type="text" className="form-input" required placeholder="client@example.com or +100000" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Password</label>
                      <button type="button" className="btn-link" style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 500 }} onClick={() => setForgotPassword(true)}>Forgot?</button>
                    </div>
                    <input type="password" className="form-input" required value={password} onChange={e => setPassword(e.target.value)} />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>Log In</button>
                  <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                    Don't have an account? <button type="button" className="btn-link" style={{ color: 'var(--color-primary)', fontWeight: 600 }} onClick={() => setIsRegister(true)}>Register</button>
                  </p>
                </form>
              )}
            </div>
          </div>
        )}

        {/* CLIENT WELCOME BANNER & POSITIVE QUOTE */}
        {token && user?.role === "CLIENT" && (
          <div className="fade-in">
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)', 
              border: '1px solid var(--color-primary-light)', 
              borderRadius: '16px', 
              padding: '22px 26px', 
              marginBottom: '20px',
              boxShadow: '0 4px 20px -2px rgba(20, 184, 166, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ 
                  background: 'var(--color-primary)', 
                  color: '#ffffff', 
                  borderRadius: '50%', 
                  width: '46px', 
                  height: '46px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 800, 
                  fontSize: '20px',
                  flexShrink: 0
                }}>
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <h1 style={{ fontSize: '24px', color: 'var(--color-primary-text)', fontWeight: 800, margin: 0 }}>
                    Welcome, {user.full_name}! 👋
                  </h1>
                  <span style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600 }}>
                    Care that fits your life — Patient Portal
                  </span>
                </div>
              </div>
              
              <div style={{ 
                marginTop: '14px', 
                padding: '12px 16px', 
                background: 'var(--color-bg-surface)', 
                borderRadius: '10px', 
                borderLeft: '4px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Sparkles size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <p style={{ fontSize: '14.5px', color: 'var(--color-text-main)', fontStyle: 'italic', fontWeight: 500, margin: 0 }}>
                  "Health is not about the weight you lose, but about the life you gain. Every step towards wellness is a victory — make today count!"
                </p>
              </div>
            </div>

            {/* CLIENT DOCTOR SPOTLIGHT CARD */}
            <div className="card" style={{ marginBottom: '28px', padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ 
                width: '90px', 
                height: '90px', 
                borderRadius: '50%', 
                overflow: 'hidden', 
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(20, 184, 166, 0.2)',
                border: '3px solid var(--color-primary-light)',
                background: 'var(--color-bg-surface-alt)'
              }}>
                <img 
                  src={doctorProfile?.picture_url || "/static/uploads/doctor_default.png"} 
                  alt={doctorProfile?.full_name || "Doctor"} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = "/doctor_default.png"; }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '19px', color: 'var(--color-primary-text)', fontWeight: 800, margin: '0 0 2px 0' }}>
                      {doctorProfile?.full_name || "Dr. Sarah Jenkins"}
                    </h3>
                    <p style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '13.5px', margin: '0 0 8px 0' }}>
                      {doctorProfile?.specialization || "Senior Physiotherapist & Wellness Specialist"} | Reg No: {doctorProfile?.registration_number || "REG-984210"}
                    </p>
                  </div>
                  {doctorProfile?.show_social_links && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {doctorProfile.linkedin_url && (
                        <a href={doctorProfile.linkedin_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>LinkedIn</a>
                      )}
                      {doctorProfile.instagram_url && (
                        <a href={doctorProfile.instagram_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>Instagram</a>
                      )}
                      {doctorProfile.facebook_url && (
                        <a href={doctorProfile.facebook_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>Facebook</a>
                      )}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '13.5px', color: 'var(--color-text-main)', fontStyle: 'italic', margin: 0, background: 'var(--color-bg-surface-alt)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                  "{doctorProfile?.bio || "Dedicated to restoring physical well-being through specialized manual and movement therapy."}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CLIENT DASHBOARD SOCIAL MEDIA LINKS */}
        {token && user?.role === "CLIENT" && doctorProfile && doctorProfile.show_social_links && (doctorProfile.linkedin_url || doctorProfile.instagram_url || doctorProfile.facebook_url) && (
          <div className="fade-in" style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '28px',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: 'var(--color-primary-text)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📱</span> Connect with Dr. {doctorProfile.full_name}
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', marginTop: '4px', margin: 0 }}>
                  Official social media pages for updates, health guidelines, and practice announcements.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {doctorProfile.show_linkedin !== false && doctorProfile.linkedin_url && (
                  <a 
                    href={doctorProfile.linkedin_url.startsWith('http') ? doctorProfile.linkedin_url : `https://${doctorProfile.linkedin_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: '#0a66c2',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      padding: '9px 16px',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(10, 102, 194, 0.25)',
                      textDecoration: 'none'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z"/></svg>
                    LinkedIn ↗
                  </a>
                )}

                {doctorProfile.show_instagram !== false && doctorProfile.instagram_url && (
                  <a 
                    href={doctorProfile.instagram_url.startsWith('http') ? doctorProfile.instagram_url : `https://${doctorProfile.instagram_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      padding: '9px 16px',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(220, 39, 67, 0.25)',
                      textDecoration: 'none'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    Instagram ↗
                  </a>
                )}

                {doctorProfile.show_facebook !== false && doctorProfile.facebook_url && (
                  <a 
                    href={doctorProfile.facebook_url.startsWith('http') ? doctorProfile.facebook_url : `https://${doctorProfile.facebook_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: '#1877f2',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      padding: '9px 16px',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(24, 119, 242, 0.25)',
                      textDecoration: 'none'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook ↗
                  </a>
                )}

                {doctorProfile.show_youtube !== false && doctorProfile.youtube_url && (
                  <a 
                    href={doctorProfile.youtube_url.startsWith('http') ? doctorProfile.youtube_url : `https://${doctorProfile.youtube_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: '#FF0000',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      padding: '9px 16px',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(255, 0, 0, 0.25)',
                      textDecoration: 'none'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    YouTube ↗
                  </a>
                )}

                {doctorProfile.show_trustpilot !== false && doctorProfile.trustpilot_url && (
                  <a 
                    href={doctorProfile.trustpilot_url.startsWith('http') ? doctorProfile.trustpilot_url : `https://${doctorProfile.trustpilot_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: '#00b67a',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      padding: '9px 16px',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0, 182, 122, 0.25)',
                      textDecoration: 'none'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    TrustPilot ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CLIENT HOME VIEW */}
        {token && user?.role === "CLIENT" && currentView === "home" && (
          <div className="fade-in">
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', color: 'var(--color-primary-text)', fontWeight: 700 }}>Choose Your Service</h2>
              <p style={{ color: 'var(--color-text-muted)' }}>Select an option below to book your healthcare, yoga exercise, or conference sessions.</p>
            </div>

            <div className="dashboard-grid">
              {/* Option 1: Book Appointment (Physiotherapy) */}
              <div className="option-card" onClick={() => selectCardCategory("SESSION_PHYSIOTHERAPY")}>
                <div className="option-icon">
                  <Calendar size={36} />
                </div>
                <h3 className="option-title">Book Appointment</h3>
                <p className="option-desc">Schedule a 1-on-1 Physiotherapy session for assessment, injury rehabilitation, and physical recovery with Dr. Jane Doe.</p>
              </div>

              {/* Option 2: Book a Yoga session */}
              <div className="option-card" onClick={() => selectCardCategory("SESSION_YOGA")}>
                <div className="option-icon">
                  <Heart size={36} />
                </div>
                <h3 className="option-title">Book a Yoga session</h3>
                <p className="option-desc">Participate in therapeutic yoga practice, movement exercises, and guided wellness sessions.</p>
              </div>

              {/* Option 3: Schedule a Conference */}
              <div className="option-card" onClick={() => selectCardCategory("CONFERENCE")}>
                <div className="option-icon">
                  <Users size={36} />
                </div>
                <h3 className="option-title">Schedule a Conference</h3>
                <p className="option-desc">Join interactive group conference calls, lectures, and healthcare workshops.</p>
              </div>
            </div>

            {/* PUBLIC FEATURED PATIENT REVIEWS & TESTIMONIALS */}
            {publicReviews.length > 0 && (
              <div className="fade-in" style={{ marginTop: '36px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '22px', color: 'var(--color-primary-text)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Star size={24} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                    Verified Patient Reviews &amp; Testimonials
                  </h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
                    Read real experiences shared by our patients following their physiotherapy, yoga, and wellness sessions.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {publicReviews.map(rev => (
                    <div 
                      key={rev.id} 
                      className="card"
                      style={{
                        padding: '20px',
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-primary-text)' }}>{rev.client_name}</span>
                          <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} size={14} style={{ fill: star <= rev.rating ? '#f59e0b' : 'none', color: star <= rev.rating ? '#f59e0b' : '#d1d5db' }} />
                            ))}
                          </div>
                        </div>

                        {rev.comment && (
                          <p style={{ fontSize: '13.5px', color: 'var(--color-text-main)', fontStyle: 'italic', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            "{rev.comment}"
                          </p>
                        )}
                      </div>

                      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                        <span>{rev.session_type_name}</span>
                        <span>{rev.appointment_date ? new Date(rev.created_at).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CLIENT SLOT BOOKING PICKER */}
        {token && user?.role === "CLIENT" && currentView === "book_picker" && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '26px', color: 'var(--color-primary-text)', fontWeight: 800 }}>Select Your Slots</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Choose the type and select from the available time slots.</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setCurrentView("home")}>Back to Dashboard</button>
            </div>

            {/* Sub-category selection if category = SESSION */}
            {selectedCategory === "SESSION" && (
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <button className={`btn ${selectedSubCategory === 'SESSION_PHYSIOTHERAPY' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => selectSubCategoryFilter("SESSION_PHYSIOTHERAPY")}>Physiotherapy</button>
                <button className={`btn ${selectedSubCategory === 'SESSION_YOGA' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => selectSubCategoryFilter("SESSION_YOGA")}>Yoga Session</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
              {/* Session type selection list */}
              <div className="card">
                <h3 style={{ marginBottom: '16px', color: 'var(--color-primary-text)' }}>Available Services</h3>
                {sessionTypes.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14.5px' }}>No active services found in this category.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sessionTypes.map(st => (
                      <div 
                        key={st.id} 
                        className={`card`} 
                        style={{ 
                          padding: '16px', 
                          cursor: 'pointer', 
                          borderColor: selectedSessionType?.id === st.id ? 'var(--color-primary)' : 'var(--color-border)',
                          background: selectedSessionType?.id === st.id ? 'var(--color-primary-light)' : 'var(--color-bg-surface)'
                        }}
                        onClick={() => loadSlotsForSessionType(st)}
                      >
                        <h4 style={{ color: 'var(--color-primary-text)' }}>{st.name}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          Duration: {st.duration_minutes} min | Max Capacity: {st.capacity}
                        </p>
                        {st.location_address && (
                          <p style={{ fontSize: '12.5px', color: 'var(--color-text-main)', marginTop: '6px', fontWeight: 500 }}>
                            📍 <span style={{ color: 'var(--color-primary-text)' }}>{st.location_address}</span>
                          </p>
                        )}
                        {st.google_maps_url && (
                          <a 
                            href={st.google_maps_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-link" 
                            style={{ display: 'inline-block', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, marginTop: '4px' }}
                            onClick={e => e.stopPropagation()}
                          >
                            🗺️ Open in Google Maps ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Slot grid calendar */}
              <div className="card">
                <h3 style={{ marginBottom: '16px', color: 'var(--color-primary-text)' }}>Available Timeslots</h3>
                {!selectedSessionType ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <Clock size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                    <p>Select a service to display available bookable hours.</p>
                  </div>
                ) : openSlots.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>No open bookable slots generated for this service in the next 6 months.</p>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', maxHeight: '350px', overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
                      {openSlots.map(slot => {
                        const start = new Date(slot.start_at);
                        const formatTime = start.toLocaleDateString() + " " + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const spotsLeft = slot.capacity - slot.booked_count;

                        return (
                          <div 
                            key={slot.id}
                            className="card"
                            style={{ 
                              padding: '12px', 
                              cursor: 'pointer',
                              textAlign: 'center',
                              borderColor: selectedSlot?.id === slot.id ? 'var(--color-accent)' : 'var(--color-border)',
                              background: selectedSlot?.id === slot.id ? 'var(--color-accent-light)' : 'var(--color-bg-surface-alt)'
                            }}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{formatTime}</span>
                            {slot.capacity > 1 && (
                              <span style={{ display: 'block', fontSize: '11.5px', marginTop: '6px', color: 'var(--color-primary)' }}>
                                {spotsLeft} / {slot.capacity} spots left
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {selectedSlot && (
                      <div className="fade-in">
                        {(selectedSessionType?.category === "SESSION_PHYSIOTHERAPY" ||
                          selectedSessionType?.category === "APPOINTMENT" ||
                          selectedSessionType?.name.toLowerCase().includes("physio") ||
                          selectedCategory === "SESSION_PHYSIOTHERAPY") && (
                          <div className="form-group" style={{ marginBottom: '16px', background: 'var(--color-bg-surface-alt)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-primary-light)' }}>
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-primary-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              ⚡ Select Physiotherapy Consultation Mode
                            </label>
                            <select 
                              className="form-select" 
                              value={bookingMode} 
                              onChange={e => setBookingMode(e.target.value as "Offline" | "Online")}
                              style={{ fontWeight: 600, borderColor: 'var(--color-primary)', background: 'white' }}
                            >
                              <option value="Offline">🏥 Offline (In-Person Clinic Visit)</option>
                              <option value="Online">💻 Online (Video / Tele-Consultation)</option>
                            </select>
                          </div>
                        )}
                        <div className="form-group">
                          <label className="form-label">Symptom notes or other special comments</label>
                          <input type="text" className="form-input" placeholder="e.g. Pain in shoulder, cold symptoms..." value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>
                        <button className="btn btn-accent" onClick={handleBook}>Confirm Booking</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CLIENT APPOINTMENTS HISTORY */}
        {token && currentView === "appointments" && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
              <h1 style={{ fontSize: '26px', color: 'var(--color-primary-text)', fontWeight: 800, margin: 0 }}>My Appointments</h1>
              
              {/* Filter toggle for Client: All Appointments vs Reviews Shared by Me */}
              <div style={{ display: 'flex', background: 'var(--color-bg-surface-alt)', padding: '3px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <button 
                  type="button" 
                  className={`btn ${clientReviewFilter === 'ALL' ? 'btn-primary' : ''}`}
                  style={{ padding: '5px 12px', fontSize: '12.5px', borderRadius: '6px', background: clientReviewFilter === 'ALL' ? 'var(--color-primary)' : 'transparent', color: clientReviewFilter === 'ALL' ? 'white' : 'var(--color-text-muted)' }}
                  onClick={() => setClientReviewFilter('ALL')}
                >
                  📋 All Appointments
                </button>
                <button 
                  type="button" 
                  className={`btn ${clientReviewFilter === 'MY_REVIEWS' ? 'btn-primary' : ''}`}
                  style={{ padding: '5px 12px', fontSize: '12.5px', borderRadius: '6px', background: clientReviewFilter === 'MY_REVIEWS' ? 'var(--color-primary)' : 'transparent', color: clientReviewFilter === 'MY_REVIEWS' ? 'white' : 'var(--color-text-muted)' }}
                  onClick={() => setClientReviewFilter('MY_REVIEWS')}
                >
                  ⭐ My Reviews ({myReviews.length})
                </button>
              </div>
            </div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>View upcoming bookings, tele-consultation links, and submit optional doctor feedback.</p>
            
            {clientReviewFilter === "MY_REVIEWS" ? (
              /* MY REVIEWS FILTERED VIEW FOR CLIENT */
              <div>
                {myReviews.length === 0 ? (
                  <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                    <Star size={48} style={{ margin: '0 auto 16px auto', color: '#f59e0b', opacity: 0.5 }} />
                    <p style={{ color: 'var(--color-text-main)', fontSize: '16px', fontWeight: 500 }}>No reviews shared yet.</p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>You can leave optional feedback for Dr. Jane Doe on any of your appointments below.</p>
                    <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setClientReviewFilter("ALL")}>View All Appointments</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {myReviews.map(rev => (
                      <div key={rev.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <h3 style={{ color: 'var(--color-primary-text)', margin: 0 }}>{rev.session_type_name}</h3>
                            <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} size={15} style={{ fill: s <= rev.rating ? '#f59e0b' : 'none', color: s <= rev.rating ? '#f59e0b' : '#d1d5db' }} />
                              ))}
                            </div>
                            <span style={{ fontSize: '12px', background: rev.is_published ? '#e6f4ea' : '#fef3c7', color: rev.is_published ? '#059669' : '#d97706', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                              {rev.is_published ? '🟢 Featured on Doctor Page' : '🔒 Private'}
                            </span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 8px 0' }}>
                            Session Date: {rev.appointment_date || 'N/A'} | Submitted: {new Date(rev.created_at).toLocaleDateString()}
                          </p>
                          {rev.comment ? (
                            <p style={{ fontSize: '14px', color: 'var(--color-text-main)', fontStyle: 'italic', margin: 0 }}>
                              "{rev.comment}"
                            </p>
                          ) : (
                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
                              No written comment (Star rating only).
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : appointments.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <Calendar size={48} style={{ margin: '0 auto 16px auto', color: 'var(--color-text-muted)', opacity: 0.5 }} />
                <p style={{ color: 'var(--color-text-main)', fontSize: '16px', fontWeight: 500 }}>No appointments yet.</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>Book your first session whenever you're ready.</p>
                <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setCurrentView("home")}>Book Now</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {appointments.map(app => {
                  const start = new Date(app.slot.start_at);
                  const startStr = start.toLocaleDateString() + " " + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const showCancel = app.status === "BOOKED";
                  const isLocked = isCancelDisabled(app.slot.start_at);
                  const hasMeeting = !!app.meeting_link;
                  const provider = app.meeting_provider || "Online Video Call";

                  return (
                    <div key={app.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h3 style={{ color: 'var(--color-primary-text)' }}>{app.session_type.name}</h3>
                            <span className={`badge badge-${app.status === 'BOOKED' ? 'success' : 'danger'}`}>{app.status}</span>
                            {hasMeeting && (
                              <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                🎥 {provider}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '14.5px', color: 'var(--color-text-main)' }}>
                            Time: <span style={{ fontWeight: 600 }}>{startStr}</span>
                          </p>
                          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            Provider: {app.doctor_name} | Notes: {app.notes_from_client || 'None'}
                          </p>
                          {app.status === "CANCELLED" && app.cancellation_reason && (
                            <p style={{ fontSize: '13px', color: 'var(--color-danger)', marginTop: '4px', fontWeight: 500 }}>
                              Cancellation Reason: {app.cancellation_reason}
                            </p>
                          )}
                        </div>
                        
                        {showCancel && (
                          <div style={{ textAlign: 'right' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ color: isLocked ? 'var(--color-text-muted)' : 'var(--color-danger)', borderColor: isLocked ? 'var(--color-border)' : '#fca5a5' }}
                              disabled={isLocked}
                              onClick={() => handleCancelAppointment(app.id)}
                            >
                              Cancel Booking
                            </button>
                            {isLocked && (
                              <p style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '6px', fontWeight: 500 }}>
                                Locked (within 1 hour window)
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Online Consultation Meeting Callout Banner for Patients */}
                      {app.status === "BOOKED" && (
                        <div style={{
                          background: hasMeeting ? 'rgba(59, 130, 246, 0.08)' : 'var(--color-bg-surface-alt)',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          marginBottom: '16px',
                          border: hasMeeting ? '1px solid #93c5fd' : '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}>
                          {app.mode === "OFFLINE" ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-text)', fontSize: '13px', background: 'rgba(20, 184, 166, 0.1)', padding: '10px 14px', borderRadius: '8px', width: '100%' }}>
                              <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
                              <span><strong>In-Person Clinic Visit:</strong> No online meeting link required. Please visit our healthcare center at scheduled time.</span>
                            </div>
                          ) : hasMeeting ? (
                            <>
                              <div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  🌐 Tele-Consultation Link Ready ({provider})
                                </span>
                                <p style={{ fontSize: '13px', color: '#1e293b', margin: '4px 0 0 0', wordBreak: 'break-all', fontWeight: 500 }}>
                                  {app.meeting_link}
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <a 
                                  href={app.meeting_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="btn btn-primary"
                                  style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2563eb', textDecoration: 'none' }}
                                >
                                  <Video size={16} /> Join Online Meeting ↗
                                </a>
                                <button 
                                  type="button" 
                                  className="btn btn-secondary"
                                  style={{ padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleCopyToClipboard(app.meeting_link!, app.id)}
                                >
                                  {copiedApptId === app.id ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                                  {copiedApptId === app.id ? 'Copied!' : 'Copy'}
                                </button>
                                <a 
                                  href={getGoogleCalendarUrl(app)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary"
                                  style={{ padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                >
                                  <Calendar size={14} /> Add to Calendar
                                </a>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                              <Clock size={16} />
                              <span>Online video meeting link will be created by Dr. Jane Doe before session start time.</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Optional Review Action Bar for Patient */}
                      {app.status !== "CANCELLED" && (
                        <div style={{ 
                          borderTop: '1px solid var(--color-border)', 
                          paddingTop: '10px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}>
                          {(() => {
                            const rev = myReviews.find(r => r.appointment_id === app.id);
                            if (rev) {
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={14} /> My Rating: {rev.rating}/5 ⭐
                                  </span>
                                  {rev.comment && (
                                    <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                      "{rev.comment}"
                                    </span>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                                Optional: Leave a rating &amp; feedback for Dr. Jane Doe
                              </span>
                            );
                          })()}

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '12.5px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => {
                              const rev = myReviews.find(r => r.appointment_id === app.id);
                              setReviewModalAppt(app);
                              setReviewRating(rev ? rev.rating : 5);
                              setReviewComment(rev ? (rev.comment || "") : "");
                            }}
                          >
                            <Star size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                            {myReviews.some(r => r.appointment_id === app.id) ? 'Edit My Review' : '⭐ Leave Optional Review'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CLIENT PRESCRIPTIONS */}
        {token && user?.role === "CLIENT" && currentView === "prescriptions" && (
          <div className="fade-in">
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '26px', color: 'var(--color-primary-text)', fontWeight: 800, margin: 0 }}>💊 My Prescriptions</h1>
              <p style={{ color: 'var(--color-text-muted)', margin: '6px 0 0 0', fontSize: '14px' }}>
                All finalized prescriptions from your doctor. Download official PDF copies for your records.
              </p>
            </div>

            {prescriptions.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center', borderStyle: 'dashed' }}>
                <FileText size={52} style={{ margin: '0 auto 16px auto', color: 'var(--color-text-muted)', opacity: 0.4 }} />
                <p style={{ color: 'var(--color-text-main)', fontSize: '16px', fontWeight: 600, margin: 0 }}>No prescriptions on file yet.</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13.5px', marginTop: '8px' }}>Your doctor will issue prescriptions after your consultations. They appear here once finalized.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {prescriptions.map(rx => {
                  const issued = rx.issued_at ? new Date(rx.issued_at) : null;
                  const issuedStr = issued ? issued.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                  const medsCount = rx.content?.medicines?.length ?? 0;
                  const instrCount = rx.content?.instructions?.length ?? 0;

                  const isExpanded = expandedRxId === rx.id;

                  return (
                    <div
                      key={rx.id}
                      className="card fade-in"
                      style={{
                        padding: '0',
                        overflow: 'hidden',
                        border: '1px solid var(--color-border)',
                        borderLeft: '5px solid var(--color-primary)'
                      }}
                    >
                      {/* Top bar */}
                      <div style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.06) 0%, rgba(14,35,90,0.04) 100%)', padding: '16px 20px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <span style={{ background: 'var(--color-primary)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                              v{rx.version} · FINALIZED
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{issuedStr}</span>
                          </div>
                          <h3 style={{ margin: 0, color: 'var(--color-primary-text)', fontSize: '16px', fontWeight: 800 }}>
                            🩺 {rx.diagnosis}
                          </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 600, fontSize: '13px' }}
                            onClick={() => setExpandedRxId(isExpanded ? null : rx.id)}
                          >
                            {isExpanded ? '🔼 Hide Preview' : '👁 View Prescription'}
                          </button>
                          <button
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 20px', fontWeight: 700 }}
                            onClick={() => handleDownloadPrescription(rx.id)}
                          >
                            <Download size={16} />
                            Download PDF
                          </button>
                        </div>
                      </div>

                      {/* Detail row */}
                      <div style={{ padding: '12px 20px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {rx.content?.vitals && (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            🫀 Pulse: <strong>{rx.content.vitals.pulse || '—'}</strong> &nbsp;
                            SpO2: <strong>{rx.content.vitals.spo2 || '—'}%</strong> &nbsp;
                            BP: <strong>{rx.content.vitals.bp || '—'}</strong>
                          </span>
                        )}
                        {medsCount > 0 && (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            💊 <strong>{medsCount}</strong> medicine{medsCount !== 1 ? 's' : ''} prescribed
                          </span>
                        )}
                        {instrCount > 0 && (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            📌 <strong>{instrCount}</strong> instruction{instrCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {rx.content?.symptoms && (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            Symptoms: {rx.content.symptoms}
                          </span>
                        )}
                      </div>

                      {/* Expandable A4 Prescription Preview */}
                      {isExpanded && (
                        <div style={{
                          padding: '20px',
                          background: '#e8edf8',
                          borderTop: '2px solid var(--color-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}>
                          <div style={{ marginBottom: '12px', alignSelf: 'flex-start' }}>
                            <span style={{ background: 'rgba(14,35,90,0.88)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                              📄 A4 Prescription Preview — matches your downloaded PDF
                            </span>
                          </div>
                          {/* A4 scaled container: true 794×1123 px, scaled to 620px wide */}
                          <div style={{
                            width: '620px',
                            height: `${Math.round(1123 * (620 / 794))}px`,
                            flexShrink: 0,
                            boxShadow: '0 8px 40px rgba(14,35,90,0.22)',
                          }}>
                            <div style={{
                              width: '794px',
                              height: '1123px',
                              transformOrigin: 'top left',
                              transform: `scale(${(620 / 794).toFixed(4)})`,
                              background: '#ffffff',
                              border: '3px solid #14225c',
                              boxSizing: 'border-box',
                              fontFamily: '"Segoe UI", Arial, sans-serif',
                              color: '#1a1a1a',
                              fontSize: '13px',
                              position: 'relative',
                              overflow: 'hidden',
                              padding: '32px 44px 0 44px',
                            }}>

                              {/* Header */}
                              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                                <div style={{ color: '#0a2c66', fontSize: '26px', fontWeight: 800, marginBottom: '5px', letterSpacing: '0.3px' }}>
                                  Futuristic Physio &amp; Wellness Hub
                                </div>
                                <div style={{ color: '#0c4dbc', fontSize: '17px', fontWeight: 800, letterSpacing: '0.5px' }}>
                                  {doctorProfile?.full_name?.toUpperCase() || 'DR. JANE DOE'}
                                </div>
                                <div style={{ color: '#001b59', fontSize: '12.5px', fontWeight: 700, lineHeight: 1.55, marginTop: '7px' }}>
                                  BPTH (KEM), MPTH (MSK), MANUAL &amp; MOVEMENT THERAPIST<br />
                                  ADVANCED REHABILITATION SPECIALIST<br />
                                  REG NO. {doctorProfile?.registration_number || '—'}
                                </div>
                              </div>

                              <hr style={{ border: 'none', borderTop: '2px solid #2f5bea', margin: '0 0 20px 0' }} />

                              {/* Patient Meta — two-column table layout */}
                              <div style={{ marginBottom: '16px' }}>
                                {[
                                  [['Name', rx.content ? (clients.find(c => c.id === rx.client_id)?.full_name || user?.full_name || '—') : '—'], ['Date', issued ? issued.toLocaleDateString('en-GB') : '—']],
                                  [['Age/Sex', (() => { const c = clients.find(c => c.id === rx.client_id); if (!c?.date_of_birth) return '—'; const dob = new Date(c.date_of_birth); const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)); return `${age}y / ${c.gender?.[0]?.toUpperCase() || '—'}`; })()], ['Mobile', clients.find(c => c.id === rx.client_id)?.phone || user?.phone || '—']],
                                  [['Office ID', `MP${rx.client_id?.slice(0,6).toUpperCase() || '——'}`], ['', '']],
                                ].map((row, ri) => (
                                  <div key={ri} style={{ display: 'table', width: '100%', marginBottom: '10px' }}>
                                    {row.map(([label, val]) => (
                                      <div key={label} style={{ display: 'table-cell', width: '50%', fontSize: '13px' }}>
                                        {label && <><span style={{ fontWeight: 800, color: '#0a2c66', marginRight: '6px' }}>{label}:</span><span style={{ display: 'inline-block', borderBottom: '1.5px solid #6a8fe6', paddingBottom: '2px', minWidth: '160px' }}>{val}</span></>}
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>

                              {/* Clinical Notes */}
                              <div style={{ marginBottom: '8px' }}>
                                {rx.content?.symptoms && <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: 1.4 }}><span style={{ fontWeight: 800, color: '#0a2c66', display: 'inline-block', minWidth: '110px' }}>Symptoms:</span> {rx.content.symptoms}</p>}
                                {rx.content?.findings && <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: 1.4 }}><span style={{ fontWeight: 800, color: '#0a2c66', display: 'inline-block', minWidth: '110px' }}>Findings:</span> {rx.content.findings}</p>}
                                {rx.content?.notes && <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: 1.4 }}><span style={{ fontWeight: 800, color: '#0a2c66', display: 'inline-block', minWidth: '110px' }}>Notes:</span> {rx.content.notes}</p>}
                                {rx.content?.vitals && <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: 1.4 }}>
                                  <span style={{ fontWeight: 800, color: '#0a2c66', display: 'inline-block', minWidth: '110px' }}>Vitals:</span>
                                  Pulse: {rx.content.vitals.pulse || '—'} /min, SPO2: {rx.content.vitals.spo2 || '—'} %, BP: {rx.content.vitals.bp || '—'} mmHg
                                  {rx.content.vitals.temp ? `, Temp: ${rx.content.vitals.temp} °F` : ''}
                                  {rx.content.vitals.weight ? `, Weight: ${rx.content.vitals.weight} kg` : ''}
                                </p>}
                                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.4 }}><span style={{ fontWeight: 800, color: '#0a2c66', display: 'inline-block', minWidth: '110px' }}>Diagnosis:</span> {rx.diagnosis}</p>
                              </div>

                              {/* Medicines Table */}
                              {(rx.content?.medicines?.length ?? 0) > 0 && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '18px 0 16px', fontSize: '12.5px' }}>
                                  <thead>
                                    <tr style={{ background: '#eef2fc' }}>
                                      {[['Rx', '5%'], ['Name', ''], ['Frequency', ''], ['Duration', ''], ['Notes', '']].map(([h, w]) => (
                                        <th key={h} style={{ border: '1.5px solid #14225c', padding: '7px 9px', textAlign: 'left', color: '#0a2c66', fontWeight: 800, ...(w ? { width: w } : {}) }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rx.content.medicines.map((med: { name: string; generic: string; frequency: string; duration: string; notes: string }, i: number) => (
                                      <tr key={i}>
                                        <td style={{ border: '1.5px solid #14225c', padding: '7px 9px', textAlign: 'center' }}>{i + 1}</td>
                                        <td style={{ border: '1.5px solid #14225c', padding: '7px 9px' }}>
                                          <strong>{med.name}</strong>
                                          {med.generic && <span style={{ fontVariant: 'small-caps', fontStyle: 'italic', color: '#333', fontSize: '11px', display: 'block', marginTop: '2px' }}>{med.generic}</span>}
                                        </td>
                                        <td style={{ border: '1.5px solid #14225c', padding: '7px 9px' }}>{med.frequency}</td>
                                        <td style={{ border: '1.5px solid #14225c', padding: '7px 9px' }}>{med.duration}</td>
                                        <td style={{ border: '1.5px solid #14225c', padding: '7px 9px' }}>{med.notes}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {/* Instructions */}
                              {(rx.content?.instructions?.length ?? 0) > 0 && (
                                <div style={{ fontSize: '13px', marginBottom: '22px' }}>
                                  <span style={{ fontWeight: 800, color: '#0a2c66' }}>Instructions:</span>
                                  <ul style={{ margin: '5px 0 0 0', paddingLeft: '22px' }}>
                                    {rx.content.instructions.map((inst: string, i: number) => <li key={i} style={{ marginBottom: '3px' }}>{inst}</li>)}
                                  </ul>
                                </div>
                              )}

                              {/* Footer: contact + signature (table layout matching PDF) */}
                              <div style={{ display: 'table', width: '100%', marginTop: '26px', marginBottom: '110px' }}>
                                <div style={{ display: 'table-cell', width: '60%', verticalAlign: 'bottom' }}>
                                  {[['☎', 'Phone', doctorProfile?.phone || '—'], ['✉', 'Email', doctorProfile?.email || '—'], ['♥', 'Instagram', '@FuturisticPhysio']].map(([icon, label, val]) => (
                                    <div key={label} style={{ marginBottom: '8px', fontSize: '12.5px' }}>
                                      <span style={{ display: 'inline-block', width: '24px', height: '24px', lineHeight: '24px', textAlign: 'center', borderRadius: '50%', background: '#0a2c66', color: '#fff', fontSize: '12px', marginRight: '7px', verticalAlign: 'middle' }}>{icon}</span>
                                      <span style={{ display: 'inline-block', verticalAlign: 'middle' }}><strong>{label}</strong><br />{val}</span>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'table-cell', width: '40%', textAlign: 'center', verticalAlign: 'bottom' }}>
                                  <div style={{ width: '170px', borderTop: '1.5px solid #333', margin: '0 auto 5px' }} />
                                  <p style={{ fontWeight: 800, color: '#0a2c66', margin: 0, fontSize: '13px' }}>Signature</p>
                                </div>
                              </div>

                              {/* Decorative wave */}
                              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, lineHeight: 0 }}>
                                <svg viewBox="0 0 1056 130" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '130px', display: 'block' }}>
                                  <path d="M0,65 C180,28 340,102 560,65 C760,37 900,84 1056,46 L1056,110 L0,110 Z" fill="#447dfd" />
                                  <path d="M0,92 C220,65 420,107 660,84 C840,65 950,98 1056,79 L1056,110 L0,110 Z" fill="#0a2358" />
                                </svg>
                              </div>

                            </div>{/* end A4 canvas */}
                          </div>{/* end scale wrapper */}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: DOCTOR VISUALS & GROWTH METRICS */}
        {token && user?.role === "DOCTOR" && currentView === "doctor_metrics" && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '26px', color: 'var(--color-primary-text)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📈 Visuals &amp; Growth Metrics
                </h1>
                <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
                  Real-time analytics for online vs offline booking splits and customer feedback sentiment breakdown.
                </p>
              </div>

              {/* Toolbar: Date Range + Refresh Query Button */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--color-bg-surface)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)' }}>From:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={metricsStartDate}
                    onChange={e => setMetricsStartDate(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12.5px', width: '135px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)' }}>To:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={metricsEndDate}
                    onChange={e => setMetricsEndDate(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12.5px', width: '135px' }}
                  />
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '5px 8px' }}
                    onClick={() => {
                      const start = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
                      const end = new Date().toISOString().split('T')[0];
                      setMetricsStartDate(start);
                      setMetricsEndDate(end);
                      fetchDoctorMetrics(start, end);
                    }}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '5px 8px' }}
                    onClick={() => {
                      const start = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
                      const end = new Date().toISOString().split('T')[0];
                      setMetricsStartDate(start);
                      setMetricsEndDate(end);
                      fetchDoctorMetrics(start, end);
                    }}
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '5px 8px' }}
                    onClick={() => {
                      const now = new Date();
                      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                      const end = now.toISOString().split('T')[0];
                      setMetricsStartDate(start);
                      setMetricsEndDate(end);
                      fetchDoctorMetrics(start, end);
                    }}
                  >
                    This Month
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  onClick={() => fetchDoctorMetrics(metricsStartDate, metricsEndDate)}
                  disabled={isLoadingMetrics}
                >
                  <RefreshCw size={15} className={isLoadingMetrics ? "spin" : ""} />
                  {isLoadingMetrics ? 'Running Query...' : '🔄 Refresh Query'}
                </button>
              </div>
            </div>

            {/* Metrics Visual Cards Grid */}
            {doctorMetrics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

                {/* GRAPH 1: BOOKINGS SPLIT (ONLINE VS OFFLINE) */}
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--color-primary-light)', paddingBottom: '12px' }}>
                    <div>
                      <h2 style={{ color: 'var(--color-primary-text)', fontWeight: 800, margin: 0, fontSize: '18px' }}>
                        📊 Graph 1: Booking Volume &amp; Type Split (Online vs Offline)
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                        Query date range: {doctorMetrics.date_range?.start_date} to {doctorMetrics.date_range?.end_date}
                      </p>
                    </div>

                    <span style={{ background: 'var(--color-bg-surface-alt)', border: '1px solid var(--color-border)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                      Total Bookings: {doctorMetrics.bookings_metrics?.total_bookings}
                    </span>
                  </div>

                  {/* Split Summary KPI Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'var(--color-bg-surface-alt)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Bookings</span>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-primary-text)', marginTop: '4px' }}>
                        {doctorMetrics.bookings_metrics?.total_bookings}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid #93c5fd', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>🌐 Online Meetings</span>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e40af', marginTop: '4px' }}>
                        {doctorMetrics.bookings_metrics?.online_count} <span style={{ fontSize: '16px', fontWeight: 600, color: '#3b82f6' }}>({doctorMetrics.bookings_metrics?.online_percentage}%)</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(20, 184, 166, 0.08)', border: '1px solid #99f6e4', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>📍 Offline / In-Person</span>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>
                        {doctorMetrics.bookings_metrics?.offline_count} <span style={{ fontSize: '16px', fontWeight: 600, color: '#14b8a6' }}>({doctorMetrics.bookings_metrics?.offline_percentage}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Proportional Split Bar */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                      <span style={{ color: '#1d4ed8' }}>🌐 Online: {doctorMetrics.bookings_metrics?.online_percentage}%</span>
                      <span style={{ color: '#0f766e' }}>📍 Offline: {doctorMetrics.bookings_metrics?.offline_percentage}%</span>
                    </div>

                    <div style={{ height: '24px', width: '100%', background: 'var(--color-bg-surface-alt)', borderRadius: '12px', overflow: 'hidden', display: 'flex', border: '1px solid var(--color-border)' }}>
                      <div
                        style={{
                          width: `${doctorMetrics.bookings_metrics?.online_percentage}%`,
                          background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                          transition: 'width 0.5s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        {doctorMetrics.bookings_metrics?.online_percentage > 10 ? `${doctorMetrics.bookings_metrics?.online_percentage}%` : ''}
                      </div>
                      <div
                        style={{
                          width: `${doctorMetrics.bookings_metrics?.offline_percentage}%`,
                          background: 'linear-gradient(90deg, #14b8a6 0%, #0d9488 100%)',
                          transition: 'width 0.5s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        {doctorMetrics.bookings_metrics?.offline_percentage > 10 ? `${doctorMetrics.bookings_metrics?.offline_percentage}%` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Daily Timeline Breakdown Graph */}
                  <div>
                    <h3 style={{ fontSize: '15px', color: 'var(--color-primary-text)', fontWeight: 700, marginBottom: '14px' }}>
                      📅 Daily Booking Timeline Trend
                    </h3>
                    {doctorMetrics.bookings_metrics?.daily_breakdown?.length === 0 ? (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                        No bookings found for the selected query date range.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                        {doctorMetrics.bookings_metrics?.daily_breakdown?.map((day: any) => (
                          <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-bg-surface-alt)', padding: '8px 12px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, width: '90px', color: 'var(--color-primary-text)' }}>{day.date}</span>
                            <div style={{ flex: 1, display: 'flex', gap: '6px', height: '14px' }}>
                              <div style={{ width: `${day.total > 0 ? (day.online / day.total) * 100 : 0}%`, background: '#3b82f6', borderRadius: '4px' }} title={`Online: ${day.online}`} />
                              <div style={{ width: `${day.total > 0 ? (day.offline / day.total) * 100 : 0}%`, background: '#14b8a6', borderRadius: '4px' }} title={`Offline: ${day.offline}`} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', width: '130px', textAlign: 'right' }}>
                              🌐 {day.online} Online | 📍 {day.offline} Offline
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* GRAPH 2: CUSTOMER FEEDBACK SENTIMENT (HAPPY, NEUTRAL, UNHAPPY) */}
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--color-primary-light)', paddingBottom: '12px' }}>
                    <div>
                      <h2 style={{ color: 'var(--color-primary-text)', fontWeight: 800, margin: 0, fontSize: '18px' }}>
                        ⭐ Graph 2: Customer Feedback Sentiment Breakdown
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                        Customer satisfaction categorized into Happy (4-5★), Neutral (3★), and Unhappy (1-2★).
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 14px', borderRadius: '20px', border: '1px solid #f59e0b' }}>
                      <Star size={16} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#b45309' }}>
                        Avg Rating: {doctorMetrics.customer_feedback_metrics?.average_rating} / 5.0
                      </span>
                    </div>
                  </div>

                  {/* Sentiment Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {/* Happy */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #6ee7b7', borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                      <span style={{ fontSize: '24px' }}>😊</span>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', marginTop: '4px' }}>Happy Customers</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>(4 to 5 Stars)</div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#065f46', marginTop: '6px' }}>
                        {doctorMetrics.customer_feedback_metrics?.happy_count}
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#10b981', marginLeft: '6px' }}>
                          ({doctorMetrics.customer_feedback_metrics?.happy_percentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Neutral */}
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #fde68a', borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                      <span style={{ fontSize: '24px' }}>😐</span>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginTop: '4px' }}>Neutral Customers</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>(3 Stars)</div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#92400e', marginTop: '6px' }}>
                        {doctorMetrics.customer_feedback_metrics?.neutral_count}
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#f59e0b', marginLeft: '6px' }}>
                          ({doctorMetrics.customer_feedback_metrics?.neutral_percentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Unhappy */}
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #fca5a5', borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                      <span style={{ fontSize: '24px' }}>🙁</span>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', marginTop: '4px' }}>Unhappy Customers</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>(1 to 2 Stars)</div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#991b1b', marginTop: '6px' }}>
                        {doctorMetrics.customer_feedback_metrics?.unhappy_count}
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#ef4444', marginLeft: '6px' }}>
                          ({doctorMetrics.customer_feedback_metrics?.unhappy_percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Star Distribution Bars */}
                  <div>
                    <h3 style={{ fontSize: '15px', color: 'var(--color-primary-text)', fontWeight: 700, marginBottom: '14px' }}>
                      ⭐ Star Distribution (1 to 5 Stars: 1 being bad to 5 being good)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = doctorMetrics.customer_feedback_metrics?.rating_distribution?.[star] || 0;
                        const total = doctorMetrics.customer_feedback_metrics?.total_reviews || 0;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const barColor = star >= 4 ? '#10b981' : star === 3 ? '#f59e0b' : '#ef4444';

                        return (
                          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, width: '130px', color: 'var(--color-primary-text)' }}>
                              {star} Star{star > 1 ? 's' : ''} {star === 1 ? '(Bad)' : star === 5 ? '(Good)' : ''}:
                            </span>
                            <div style={{ flex: 1, background: 'var(--color-bg-surface-alt)', height: '14px', borderRadius: '7px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                              <div style={{ width: `${pct}%`, background: barColor, height: '100%', borderRadius: '7px', transition: 'width 0.4s ease' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', width: '80px', textAlign: 'right' }}>
                              {count} review{count !== 1 ? 's' : ''} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Click "🔄 Refresh Query" to fetch growth metrics for the selected date range.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: DOCTOR DASHBOARD (Patient Management, Record Editor, Appointments Queue, Slot Monitor & Testimonials Moderation) */}
        {token && user?.role === "DOCTOR" && (currentView === "home" || currentView === "doctor_dashboard") && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '26px', color: 'var(--color-primary-text)', fontWeight: 800, margin: 0 }}>
                  📊 Doctor Clinical Dashboard
                </h1>
                <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
                  Real-time patient record editing, appointments queue, slot monitor, and patient reviews moderation.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ background: 'var(--color-bg-surface-alt)', border: '1px solid var(--color-border)', padding: '6px 14px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 600 }}>
                  👥 {clients.length} Registered Patients
                </span>
                <span style={{ background: 'rgba(20, 184, 166, 0.1)', border: '1px solid var(--color-primary)', color: 'var(--color-primary-text)', padding: '6px 14px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 700 }}>
                  ⭐ {doctorReviews.filter(r => r.is_published).length} Featured Reviews
                </span>
              </div>
            </div>

            {/* Dashboard Grid: Left Panel (Patient Record Editor & Testimonials) | Right Panel (Appointments Queue, Slot Calendar & Rx Writer) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '28px' }}>
              
              {/* Left Column: Patients & Reviews */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Section 0.5: Patient Details & Database Record Editor */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                    <h3 style={{ color: 'var(--color-primary-text)', margin: 0, fontSize: '16px' }}>Patient Details &amp; Database Editor</h3>
                  </div>

                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                    Search and select any registered patient to view or alter their records (Primary Phone, WhatsApp Number, Address, Email, Medical History) directly in the database.
                  </p>

                  {/* Instant Search Filter Input */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>🔍 Filter Patient by Name, Email or Phone</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Type patient name, email, primary phone, or WhatsApp number..." 
                      value={clientSearchQuery} 
                      onChange={e => setClientSearchQuery(e.target.value)} 
                    />
                  </div>

                  {/* Dropdown Selector */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Select Patient to Edit</label>
                    <select 
                      className="form-select" 
                      value={editingClient?.id || ""} 
                      onChange={e => {
                        const selected = clients.find(c => c.id === e.target.value);
                        if (selected) handleSelectClientForEdit(selected);
                        else setEditingClient(null);
                      }}
                    >
                      <option value="">-- Choose patient ({clients.filter(c => {
                        if (!clientSearchQuery.trim()) return true;
                        const q = clientSearchQuery.toLowerCase();
                        return (c.full_name && c.full_name.toLowerCase().includes(q)) ||
                               (c.email && c.email.toLowerCase().includes(q)) ||
                               (c.phone && c.phone.includes(q)) ||
                               (c.alternate_phone && c.alternate_phone.includes(q));
                      }).length} matching) --</option>
                      {clients
                        .filter(c => {
                          if (!clientSearchQuery.trim()) return true;
                          const q = clientSearchQuery.toLowerCase();
                          return (c.full_name && c.full_name.toLowerCase().includes(q)) ||
                                 (c.email && c.email.toLowerCase().includes(q)) ||
                                 (c.phone && c.phone.includes(q)) ||
                                 (c.alternate_phone && c.alternate_phone.includes(q));
                        })
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.full_name} | Phone: {c.phone} {c.alternate_phone ? `(WhatsApp: ${c.alternate_phone})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Quick Patient Cards List if fewer than 5 match */}
                  {!editingClient && clients.length > 0 && (
                    <div style={{ marginTop: '10px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                      {clients
                        .filter(c => {
                          if (!clientSearchQuery.trim()) return true;
                          const q = clientSearchQuery.toLowerCase();
                          return (c.full_name && c.full_name.toLowerCase().includes(q)) ||
                                 (c.email && c.email.toLowerCase().includes(q)) ||
                                 (c.phone && c.phone.includes(q)) ||
                                 (c.alternate_phone && c.alternate_phone.includes(q));
                        })
                        .slice(0, 5)
                        .map(c => (
                          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-surface-alt)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary-text)' }}>{c.full_name}</div>
                              <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                                📧 {c.email} | 📞 Phone: {c.phone} {c.alternate_phone ? `| 💬 WhatsApp: ${c.alternate_phone}` : ''}
                              </div>
                            </div>
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              style={{ fontSize: '11px', padding: '4px 10px', flexShrink: 0 }}
                              onClick={() => handleSelectClientForEdit(c)}
                            >
                              ✏️ Edit Details
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Form to alter patient record details */}
                  {editingClient ? (
                    <form onSubmit={handleSaveClientRecord} style={{ background: 'var(--color-bg-surface-alt)', padding: '14px', borderRadius: '10px', border: '1px solid var(--color-border)', marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                        <h4 style={{ margin: 0, color: 'var(--color-primary-text)', fontSize: '14px', fontWeight: 700 }}>
                          ✏️ Altering Patient Details: {editingClient.full_name}
                        </h4>
                        <button type="button" className="btn-link" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }} onClick={() => setEditingClient(null)}>Close Form</button>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11.5px' }}>Full Name</label>
                        <input type="text" className="form-input" required value={editClientName} onChange={e => setEditClientName(e.target.value)} />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11.5px' }}>Email Address</label>
                        <input type="email" className="form-input" required value={editClientEmail} onChange={e => setEditClientEmail(e.target.value)} />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11.5px' }}>Primary Mobile Phone (Calling &amp; Login)</label>
                        <input type="text" className="form-input" required value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11.5px' }}>WhatsApp / Alternate Calling Number (Optional)</label>
                        <input type="text" className="form-input" placeholder="e.g. +1987654321" value={editClientAltPhone} onChange={e => setEditClientAltPhone(e.target.value)} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11.5px' }}>Date of Birth</label>
                          <input type="date" className="form-input" value={editClientDob} onChange={e => setEditClientDob(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11.5px' }}>Gender</label>
                          <select className="form-select" value={editClientGender} onChange={e => setEditClientGender(e.target.value)}>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11.5px' }}>Home Address</label>
                        <input type="text" className="form-input" value={editClientAddress} onChange={e => setEditClientAddress(e.target.value)} />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11.5px' }}>Medical History Summary</label>
                        <textarea className="form-textarea" rows={3} value={editClientMedHistory} onChange={e => setEditClientMedHistory(e.target.value)} />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isSavingClientRecord}>
                        {isSavingClientRecord ? "Saving to Database..." : "💾 Update Patient Database Record"}
                      </button>
                    </form>
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', background: 'var(--color-bg-surface-alt)', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Search or select a patient from above to view and alter their database records.
                      </p>
                    </div>
                  )}
                </div>

                {/* Section E: Patient Reviews & Visibility Management for Doctor */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid var(--color-primary-light)', paddingBottom: '12px' }}>
                    <div>
                      <h2 style={{ color: 'var(--color-primary-text)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Star size={22} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                        Patient Reviews &amp; Testimonials Control
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                        View all submitted patient reviews by patient name &amp; date. Selectively toggle which reviews appear publicly on the landing page for existing and new customers.
                      </p>
                    </div>

                    <span style={{ fontSize: '12px', background: 'var(--color-bg-surface-alt)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--color-border)', fontWeight: 600 }}>
                      Total Reviews: {doctorReviews.length}
                    </span>
                  </div>

                  {doctorReviews.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13.5px', padding: '16px 0', textAlign: 'center' }}>
                      No patient reviews submitted yet. When patients review their completed appointments, they will appear here for your review and visibility control.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                      {doctorReviews.map(rev => (
                        <div key={rev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--color-bg-surface-alt)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                          <div style={{ flex: 1, paddingRight: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '14.5px', color: 'var(--color-primary-text)' }}>{rev.client_name}</strong>
                              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>({rev.session_type_name})</span>
                              <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} size={13} style={{ fill: s <= rev.rating ? '#f59e0b' : 'none', color: s <= rev.rating ? '#f59e0b' : '#d1d5db' }} />
                                ))}
                              </div>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 6px 0' }}>
                              📅 Appointment Date/Time: {rev.appointment_date || 'N/A'} | Submitted: {new Date(rev.created_at).toLocaleDateString()}
                            </p>
                            {rev.comment && (
                              <p style={{ fontSize: '13.5px', color: 'var(--color-text-main)', fontStyle: 'italic', margin: 0, background: 'var(--color-bg-surface)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                "{rev.comment}"
                              </p>
                            )}
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <button
                              type="button"
                              className={`btn ${rev.is_published ? 'btn-primary' : 'btn-secondary'}`}
                              style={{
                                fontSize: '12px',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                background: rev.is_published ? '#059669' : 'transparent',
                                borderColor: rev.is_published ? '#059669' : 'var(--color-border)',
                                color: rev.is_published ? 'white' : 'var(--color-text-muted)'
                              }}
                              onClick={() => handleToggleReviewPublished(rev.id, rev.is_published)}
                              title={rev.is_published ? 'Click to hide from public landing page' : 'Click to feature on public landing page'}
                            >
                              {rev.is_published ? '🟢 Featured on Landing Page' : '⚪ Hidden (Private)'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Appointments Queue, Slots Monitor & Prescription Writer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Section: Online Bookings & Interactive Calendar Library */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '2px solid var(--color-primary-light)', paddingBottom: '12px' }}>
                    <div>
                      <h2 style={{ color: 'var(--color-primary-text)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={24} style={{ color: 'var(--color-primary)' }} />
                        Online Bookings &amp; Calendar Library
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                        Manage online consultations, generate Google Meet / Zoom / MS Teams links, and sync calendar events.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Filter chips */}
                      <div style={{ display: 'flex', background: 'var(--color-bg-surface-alt)', padding: '3px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                        <button 
                          type="button" 
                          className={`btn ${calendarFilter === 'ONLINE' ? 'btn-primary' : ''}`}
                          style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', background: calendarFilter === 'ONLINE' ? 'var(--color-primary)' : 'transparent', color: calendarFilter === 'ONLINE' ? 'white' : 'var(--color-text-muted)' }}
                          onClick={() => setCalendarFilter('ONLINE')}
                        >
                          🌐 Online Only
                        </button>
                        <button 
                          type="button" 
                          className={`btn ${calendarFilter === 'IN_PERSON' ? 'btn-primary' : ''}`}
                          style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', background: calendarFilter === 'IN_PERSON' ? 'var(--color-primary)' : 'transparent', color: calendarFilter === 'IN_PERSON' ? 'white' : 'var(--color-text-muted)' }}
                          onClick={() => setCalendarFilter('IN_PERSON')}
                        >
                          🏥 In-Person
                        </button>
                        <button 
                          type="button" 
                          className={`btn ${calendarFilter === 'ALL' ? 'btn-primary' : ''}`}
                          style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', background: calendarFilter === 'ALL' ? 'var(--color-primary)' : 'transparent', color: calendarFilter === 'ALL' ? 'white' : 'var(--color-text-muted)' }}
                          onClick={() => setCalendarFilter('ALL')}
                        >
                          All Bookings
                        </button>
                      </div>

                      {/* View mode toggle */}
                      <div style={{ display: 'flex', background: 'var(--color-bg-surface-alt)', padding: '3px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                        <button 
                          type="button"
                          style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '6px', background: calendarViewMode === 'calendar' ? 'var(--color-accent)' : 'transparent', color: calendarViewMode === 'calendar' ? 'white' : 'var(--color-text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setCalendarViewMode('calendar')}
                        >
                          <Grid size={14} /> Calendar
                        </button>
                        <button 
                          type="button"
                          style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '6px', background: calendarViewMode === 'list' ? 'var(--color-accent)' : 'transparent', color: calendarViewMode === 'list' ? 'white' : 'var(--color-text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setCalendarViewMode('list')}
                        >
                          <List size={14} /> List
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Navigation Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: 'var(--color-bg-surface-alt)', padding: '10px 16px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button 
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          const d = new Date(calendarMonth);
                          d.setMonth(d.getMonth() - 1);
                          setCalendarMonth(d);
                        }}
                      >
                        <ChevronLeft size={16} /> Prev
                      </button>
                      <button 
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setCalendarMonth(new Date())}
                      >
                        Today
                      </button>
                      <button 
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          const d = new Date(calendarMonth);
                          d.setMonth(d.getMonth() + 1);
                          setCalendarMonth(d);
                        }}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>

                    <h3 style={{ fontSize: '17px', color: 'var(--color-primary-text)', fontWeight: 700, margin: 0 }}>
                      {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h3>
                  </div>

                  {/* LIST VIEW MODE */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                    {appointments.filter(app => {
                      if (app.status === "CANCELLED") return false;
                      const isOnline = !!app.meeting_link || 
                        (app.notes_from_client && app.notes_from_client.toLowerCase().includes("online")) || 
                        (app.session_type && (app.session_type.category === "CONFERENCE" || app.session_type.name.toLowerCase().includes("online")));

                      if (calendarFilter === "ONLINE") return isOnline;
                      if (calendarFilter === "IN_PERSON") return !isOnline;
                      return true;
                    }).length === 0 ? (
                      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>No bookings matching current filter.</p>
                    ) : (
                      appointments.filter(app => {
                        if (app.status === "CANCELLED") return false;
                        const isOnline = !!app.meeting_link || 
                          (app.notes_from_client && app.notes_from_client.toLowerCase().includes("online")) || 
                          (app.session_type && (app.session_type.category === "CONFERENCE" || app.session_type.name.toLowerCase().includes("online")));

                        if (calendarFilter === "ONLINE") return isOnline;
                        if (calendarFilter === "IN_PERSON") return !isOnline;
                        return true;
                      }).map(app => {
                        const start = new Date(app.slot.start_at);
                        const startStr = start.toLocaleDateString() + " " + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const hasLink = !!app.meeting_link;
                        const provider = app.meeting_provider || "Google Meet";
                        const isOffline = app.mode === "OFFLINE";

                        return (
                          <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-bg-surface-alt)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--color-primary-text)' }}>{app.client_name}</span>
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>({app.session_type.name})</span>
                                {isOffline ? (
                                  <span className="badge badge-info" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#0f766e', border: '1px solid #14b8a6' }}>
                                    📍 Offline Visit (No Link Needed)
                                  </span>
                                ) : (
                                  <span className={`badge badge-${hasLink ? 'success' : 'warning'}`}>
                                    {hasLink ? `🟢 ${provider} Ready` : '⚡ Link Required'}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: '13px', color: 'var(--color-text-main)', marginTop: '4px', margin: 0 }}>
                                📅 {startStr} | Notes: {app.notes_from_client || 'None'}
                              </p>
                              {isOffline ? (
                                <p style={{ fontSize: '12px', color: '#0f766e', marginTop: '4px', margin: 0, fontWeight: 500 }}>
                                  🏥 In-Person Healthcare Center Visit
                                </p>
                              ) : hasLink ? (
                                <p style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '4px', margin: 0, fontWeight: 500 }}>
                                  🔗 {app.meeting_link}
                                </p>
                              ) : null}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {isOffline ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', borderColor: '#93c5fd' }}
                                  onClick={() => handleConvertAppointmentToOnline(app.id)}
                                  title="Convert customer offline appointment to online meeting"
                                >
                                  🔄 Convert to Online Meeting
                                </button>
                              ) : (
                                <button 
                                  type="button" 
                                  className="btn btn-primary"
                                  style={{ padding: '6px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                  onClick={() => {
                                    setSelectedAppointmentForMeeting(app);
                                    setMeetingProvider(app.meeting_provider || "Google Meet");
                                    setMeetingLinkInput(app.meeting_link || generateDefaultMeetingUrl(app.meeting_provider || "Google Meet", app.id));
                                  }}
                                >
                                  <Video size={14} /> {hasLink ? 'Edit Link' : 'Create Meeting Link'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Materialized Slots Calendar */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: 'var(--color-primary-text)', margin: 0 }}>Materialized Slots Calendar (Next 6 Months)</h3>
                    {docCalendarSlots.length > 0 && (
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        style={{ color: 'var(--color-danger)', borderColor: '#fca5a5', fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={handleCancelAllAvailability}
                        title="Cancel all active unbooked availability slots (booked slots remain preserved)"
                      >
                        <Trash2 size={14} />
                        Cancel Active Availability
                      </button>
                    )}
                  </div>
                  {docCalendarSlots.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>No slots materialized. Add Weekly Availability Rules in Doctor Setup to pre-generate bookable time blocks.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
                      {docCalendarSlots.map(slot => {
                        const start = new Date(slot.start_at);
                        const formatTime = start.toLocaleDateString() + " " + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isBooked = slot.booked_count > 0;

                        return (
                          <div 
                            key={slot.id} 
                            className="card"
                            style={{ 
                              padding: '12px', 
                              borderColor: isBooked ? 'var(--color-success)' : 'var(--color-border)',
                              background: isBooked ? '#e6f4ea' : 'var(--color-bg-surface-alt)'
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>{formatTime}</span>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                              Bookings: {slot.booked_count} / {slot.capacity}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                </div>
              </div>

                {/* ── PATIENT-WISE PRESCRIPTION DIRECTORY & MANAGEMENT ── */}
                <div className="card" style={{ marginTop: '28px', padding: '24px', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', color: 'var(--color-primary-text)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💊 Patient Prescription Directory &amp; History
                      </h2>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
                        View, filter patient-wise, edit, resave, download PDF, or delete current &amp; past prescriptions.
                      </p>
                    </div>

                    {/* Controls: Patient Dropdown + Status Filter + Search */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Patient selector filter */}
                      <div style={{ minWidth: '220px' }}>
                        <select
                          className="form-select"
                          style={{ fontSize: '13px', padding: '8px 12px' }}
                          value={selectedPatientFilter}
                          onChange={(e) => {
                            setSelectedPatientFilter(e.target.value);
                            fetchDoctorPrescriptions(e.target.value);
                          }}
                        >
                          <option value="">👤 All Patients Directory ({clients.length})</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>👤 {c.full_name} ({c.phone || 'No phone'})</option>
                          ))}
                        </select>
                      </div>

                      {/* Status filter buttons */}
                      <div style={{ display: 'flex', background: 'var(--color-bg-surface-alt)', borderRadius: '8px', padding: '3px', border: '1px solid var(--color-border)' }}>
                        {["ALL", "FINALIZED", "DRAFT"].map((st) => (
                          <button
                            key={st}
                            type="button"
                            className={`btn ${selectedStatusFilter === st ? 'btn-primary' : 'btn-link'}`}
                            style={{
                              padding: '5px 12px',
                              fontSize: '12px',
                              borderRadius: '6px',
                              fontWeight: selectedStatusFilter === st ? 700 : 500
                            }}
                            onClick={() => setSelectedStatusFilter(st)}
                          >
                            {st === "ALL" ? 'All Prescriptions' : st === "FINALIZED" ? '✅ Finalized' : '📝 Drafts'}
                          </button>
                        ))}
                      </div>

                      {/* Search Input */}
                      <input
                        type="text"
                        className="form-input"
                        placeholder="🔍 Search patient or diagnosis..."
                        style={{ width: '220px', fontSize: '13px', padding: '8px 12px' }}
                        value={rxSearchQuery}
                        onChange={(e) => setRxSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Prescription Cards Directory */}
                  {(() => {
                    let filtered = doctorPrescriptions.filter(rx => {
                      if (selectedStatusFilter !== "ALL" && rx.status !== selectedStatusFilter) return false;
                      if (rxSearchQuery.trim()) {
                        const q = rxSearchQuery.toLowerCase();
                        const pName = (rx.client_name || '').toLowerCase();
                        const diag = (rx.diagnosis || '').toLowerCase();
                        return pName.includes(q) || diag.includes(q);
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--color-bg-surface-alt)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                          <p style={{ fontSize: '15px', color: 'var(--color-text-main)', fontWeight: 600, margin: 0 }}>No prescriptions found matching criteria.</p>
                          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '6px' }}>Select a patient from the dropdown above or create a new prescription using the Interactive Prescription Editor below.</p>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                        {filtered.map(rx => {
                          const isEditingThis = editingRxId === rx.id;
                          const formattedDate = rx.issued_at 
                            ? new Date(rx.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : "Draft (Unfinalized)";

                          return (
                            <div 
                              key={rx.id} 
                              className="card"
                              style={{
                                padding: '18px',
                                borderRadius: '12px',
                                border: isEditingThis ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                background: isEditingThis ? 'rgba(20, 184, 166, 0.05)' : 'var(--color-bg-surface)',
                                boxShadow: isEditingThis ? '0 4px 14px rgba(20, 184, 166, 0.15)' : 'none',
                                position: 'relative'
                              }}
                            >
                              {/* Card Header: Patient Name & Status */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div>
                                  <h4 style={{ margin: '0 0 3px 0', fontSize: '15px', color: 'var(--color-primary-text)', fontWeight: 800 }}>
                                    👤 {rx.client_name || 'Patient'}
                                  </h4>
                                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>
                                    📅 {formattedDate} • Version #{rx.version}
                                  </span>
                                </div>
                                <span className={`badge ${rx.status === 'FINALIZED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
                                  {rx.status === 'FINALIZED' ? '✅ Finalized' : '📝 Draft'}
                                </span>
                              </div>

                              {/* Diagnosis & Summary */}
                              <div style={{ background: 'var(--color-bg-surface-alt)', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid var(--color-border)' }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary-text)' }}>
                                  🩺 {rx.diagnosis}
                                </p>
                                {rx.content?.medicines?.length > 0 && (
                                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-main)' }}>
                                    💊 Medicines ({rx.content.medicines.length}): {rx.content.medicines.map(m => m.name).join(', ')}
                                  </p>
                                )}
                              </div>

                              {/* Actions Footer */}
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px dashed var(--color-border)' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ fontSize: '11.5px', padding: '4px 9px' }}
                                  onClick={() => setPreviewRxModal(rx)}
                                  title="View Prescription Details"
                                >
                                  👁 Preview
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ fontSize: '11.5px', padding: '4px 9px' }}
                                  onClick={() => handleEditPrescription(rx)}
                                  title="Edit and Resave Prescription"
                                >
                                  ✏️ Edit / Resave
                                </button>

                                {rx.status === "FINALIZED" && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ fontSize: '11.5px', padding: '4px 9px' }}
                                    onClick={() => handleDownloadPrescription(rx.id)}
                                    title="Download Official PDF"
                                  >
                                    📥 PDF
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  style={{ fontSize: '11.5px', padding: '4px 9px', marginLeft: 'auto' }}
                                  onClick={() => handleDeletePrescription(rx.id)}
                                  title="Delete Prescription Record"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Full-Width Prescription Editor Section (Left-to-Right Full Page Screen) */}
                <div id="rx-editor-section" className="card" style={{ padding: '0', overflow: 'hidden', marginTop: '28px', width: '100%' }}>
                  {/* ── Editing Mode Top Banner ── */}
                  {editingRxId && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(13, 148, 136, 0.25) 100%)', borderBottom: '2px solid var(--color-primary)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-primary-text)' }}>
                        ✏️ Editing Existing Prescription (Version #{editingRxVersion})
                      </span>
                      <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handleCancelEdit}>
                        ✕ Cancel Editing (Switch to New)
                      </button>
                    </div>
                  )}

                  {/* ── Editor Header ── */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '2px solid var(--color-primary-light)', background: 'var(--color-bg-surface)' }}>
                    <div>
                      <h2 style={{ color: 'var(--color-primary-text)', fontWeight: 800, margin: 0, fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📝 Full-Page Interactive Prescription Editor
                      </h2>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Branded Rx template — full screen layout with live WYSIWYG PDF preview &amp; instant database persistence
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {templates.map(temp => (
                        <button key={temp.id} type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px' }} onClick={() => handleLoadTemplate(temp)}>
                          📋 Load "{temp.name}"
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`btn ${rxShowPreview ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 14px', fontSize: '12.5px', fontWeight: 600 }}
                        onClick={() => setRxShowPreview(p => !p)}
                      >
                        {rxShowPreview ? '👁 Hide Live PDF Preview' : '👁 Show Live PDF Preview'}
                      </button>
                    </div>
                  </div>

                  {/* ── Full Width / Two-column layout: Form | Live Preview ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: rxShowPreview ? '1fr 1fr' : '1fr', gap: '0' }}>

                    {/* LEFT: Form inputs */}
                    <div style={{ padding: '24px 28px', borderRight: rxShowPreview ? '1px solid var(--color-border)' : 'none' }}>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '16px', marginBottom: '18px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: '13px' }}>👤 Select Patient *</label>
                          <select className="form-select" style={{ fontSize: '13.5px', padding: '9px 12px' }} value={rxClient} onChange={e => setRxClient(e.target.value)}>
                            <option value="">-- select patient from directory --</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: '13px' }}>🩺 Diagnosis / Clinical Impression *</label>
                          <input type="text" className="form-input" style={{ fontSize: '13.5px', padding: '9px 12px' }} placeholder="e.g. Acute Lumbar Radiculopathy / Cervical Spondylosis" value={rxDiagnosis} onChange={e => setRxDiagnosis(e.target.value)} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '12.5px' }}>Symptoms / Chief Complaints</label>
                          <input type="text" className="form-input" placeholder="e.g. Lower back pain radiating to leg" value={rxSymptoms} onChange={e => setRxSymptoms(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '12.5px' }}>Clinical &amp; Physical Findings</label>
                          <input type="text" className="form-input" placeholder="e.g. SLR positive at 45 deg, muscle spasm" value={rxFindings} onChange={e => setRxFindings(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '12.5px' }}>General Clinical Advice / Notes</label>
                          <input type="text" className="form-input" placeholder="e.g. Avoid heavy lifting, ergonomic posture" value={rxNotes} onChange={e => setRxNotes(e.target.value)} />
                        </div>
                      </div>

                      {/* Vitals */}
                      <div style={{ background: 'var(--color-bg-surface-alt)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '20px' }}>
                        <p style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--color-primary-text)', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🫀 Patient Vitals Monitor</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                          {[
                            { label: 'Pulse (bpm)', ph: '76', val: rxPulse, set: setRxPulse },
                            { label: 'SPO2 (%)', ph: '96', val: rxSpo2, set: setRxSpo2 },
                            { label: 'BP (mmHg)', ph: '120/75', val: rxBp, set: setRxBp },
                            { label: 'Temp (°F)', ph: '98.6', val: rxTemp, set: setRxTemp },
                            { label: 'Weight (kg)', ph: '70', val: rxWeight, set: setRxWeight },
                          ].map(({ label, ph, val, set }) => (
                            <div key={label} className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>{label}</label>
                              <input type="text" className="form-input" style={{ fontSize: '13px', background: 'var(--color-bg-surface)' }} placeholder={ph} value={val} onChange={e => set(e.target.value)} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Medicines */}
                      <div style={{ background: 'var(--color-bg-surface-alt)', padding: '16px 18px', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '20px' }}>
                        <p style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--color-primary-text)', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💊 Prescribed Medicines (Rx Table)</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1.2fr auto', gap: '10px', alignItems: 'end', marginBottom: '14px' }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>Medicine Brand Name</label>
                            <input type="text" className="form-input" style={{ fontSize: '13px', background: 'var(--color-bg-surface)' }} placeholder="e.g. Cepodem XP 325 mg" value={newMedName} onChange={e => setNewMedName(e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>Generic Formula</label>
                            <input type="text" className="form-input" style={{ fontSize: '13px', background: 'var(--color-bg-surface)' }} placeholder="e.g. Cefpodoxime" value={newMedGen} onChange={e => setNewMedGen(e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>Dosage / Freq</label>
                            <input type="text" className="form-input" style={{ fontSize: '13px', background: 'var(--color-bg-surface)' }} placeholder="e.g. 1-0-1" value={newMedFreq} onChange={e => setNewMedFreq(e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>Duration</label>
                            <input type="text" className="form-input" style={{ fontSize: '13px', background: 'var(--color-bg-surface)' }} placeholder="e.g. 5 days" value={newMedDur} onChange={e => setNewMedDur(e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>Timing / Instructions</label>
                            <input type="text" className="form-input" style={{ fontSize: '13px', background: 'var(--color-bg-surface)' }} placeholder="e.g. After food" value={newMedNotes} onChange={e => setNewMedNotes(e.target.value)} />
                          </div>
                          <button type="button" className="btn btn-primary" style={{ fontSize: '13px', padding: '9px 16px', fontWeight: 700 }} onClick={handleAddMedicineRow}>＋ Add Medicine</button>
                        </div>

                        {rxMedicines.length > 0 ? (
                          <table className="table" style={{ marginBottom: '0', fontSize: '13px', background: 'var(--color-bg-surface)' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '40px' }}>#</th><th>Medicine Name</th><th>Generic Formula</th><th>Frequency</th><th>Duration</th><th>Timing / Notes</th><th style={{ width: '40px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {rxMedicines.map((med, i) => (
                                <tr key={i}>
                                  <td style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 600 }}>{i + 1}</td>
                                  <td><strong style={{ color: 'var(--color-primary-text)' }}>{med.name}</strong></td>
                                  <td style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>{med.generic || '—'}</td>
                                  <td><span className="badge badge-info" style={{ fontSize: '12px' }}>{med.frequency}</span></td>
                                  <td>{med.duration}</td>
                                  <td>{med.notes || '—'}</td>
                                  <td>
                                    <button type="button" className="btn-link" style={{ color: 'var(--color-danger)' }} onClick={() => handleRemoveMedicineRow(i)}>
                                      <Trash2 size={15} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '12px', color: 'var(--color-text-muted)', fontSize: '12.5px', fontStyle: 'italic' }}>
                            No medicines added to prescription table yet. Type details above and click "＋ Add Medicine".
                          </div>
                        )}
                      </div>

                      {/* Instructions */}
                      <div style={{ background: 'var(--color-bg-surface-alt)', padding: '16px 18px', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '22px' }}>
                        <p style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--color-primary-text)', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📌 Special Instructions &amp; Rehabilitation Guidelines</p>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: rxInstructions.length > 0 ? '12px' : '0' }}>
                          <input type="text" className="form-input" style={{ fontSize: '13px', background: 'var(--color-bg-surface)' }} placeholder="e.g. Salt water gargling twice daily / Core isometric exercises 2x/day" value={newInstruction} onChange={e => setNewInstruction(e.target.value)} />
                          <button type="button" className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px', flexShrink: 0 }} onClick={handleAddInstructionRow}>＋ Add Instruction</button>
                        </div>

                        {rxInstructions.length > 0 && (
                          <ul style={{ margin: 0, paddingLeft: '20px', background: 'var(--color-bg-surface)', padding: '12px 16px 12px 32px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                            {rxInstructions.map((inst, i) => (
                              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i === rxInstructions.length - 1 ? 0 : '6px', fontSize: '13.5px' }}>
                                <span>{inst}</span>
                                <button type="button" className="btn-link" style={{ color: 'var(--color-danger)', flexShrink: 0, marginLeft: '8px' }} onClick={() => handleRemoveInstructionRow(i)}>
                                  <Trash2 size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* ── Action buttons ── */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--color-border)', paddingTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {editingRxId && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '13.5px', padding: '10px 16px' }}
                              onClick={handleCancelEdit}
                            >
                              ✕ Cancel
                            </button>
                          )}
                          <button
                            id="rx-save-draft-btn"
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '13.5px', padding: '10px 22px', fontWeight: 600 }}
                            disabled={isGeneratingPdf}
                            onClick={() => handleCreatePrescription("DRAFT")}
                          >
                            {editingRxId ? "💾 Update & Save Draft" : "💾 Save as Draft"}
                          </button>
                          <button
                            id="rx-finalize-btn"
                            type="button"
                            className="btn btn-accent"
                            style={{
                              fontSize: '13.5px',
                              padding: '10px 24px',
                              fontWeight: 700,
                              opacity: isGeneratingPdf ? 0.75 : 1,
                              cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            disabled={isGeneratingPdf}
                            onClick={() => handleCreatePrescription("FINALIZED")}
                          >
                            {isGeneratingPdf ? (
                              <>
                                <span style={{
                                  display: 'inline-block',
                                  width: '15px', height: '15px',
                                  border: '2px solid rgba(255,255,255,0.3)',
                                  borderTop: '2px solid #fff',
                                  borderRadius: '50%',
                                  animation: 'spin 0.8s linear infinite'
                                }} />
                                Generating PDF…
                              </>
                            ) : (
                              <>{editingRxId ? "✅ Resave & Re-Finalize PDF" : "🖨️ Finalize & Render Official PDF"}</>
                            )}
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '180px', fontSize: '13px' }}
                            placeholder="Template name…"
                            value={newTemplateName}
                            onChange={e => setNewTemplateName(e.target.value)}
                          />
                          <button type="button" className="btn btn-secondary" style={{ fontSize: '12.5px', padding: '9px 14px' }} onClick={handleSaveAsTemplate}>
                            💾 Save Template
                          </button>
                        </div>
                      </div>

                    </div>{/* end form column */}

                    {/* RIGHT: Live WYSIWYG Preview Panel — A4 layout scaled to fit */}
                    {rxShowPreview && (
                      <div style={{
                        padding: '16px 12px 12px',
                        background: '#e8edf8',
                        overflowY: 'auto',
                        maxHeight: '900px',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}>
                        {/* Preview label */}
                        <div style={{
                          position: 'sticky', top: 0,
                          background: 'rgba(14, 35, 90, 0.92)',
                          color: '#fff',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '6px 14px',
                          borderRadius: '6px',
                          marginBottom: '14px',
                          zIndex: 2,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          alignSelf: 'flex-start',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          👁 Live Preview — Exact Match of Finalized PDF
                        </div>

                        {/*
                          A4 at 96 dpi = 794px × 1123px.
                          We render at full A4 size then scale it down to
                          fit the panel width (~500px) using CSS transform.
                          The outer wrapper is shrunk to match the scaled height
                          so the panel scroll works correctly.
                        */}
                        <div style={{
                          width: '500px',
                          height: `${Math.round(1123 * (500 / 794))}px`,
                          flexShrink: 0,
                          boxShadow: '0 8px 40px rgba(14,35,90,0.25)',
                        }}>
                          {/* A4 canvas at true 794×1123 px, scaled down */}
                          <div style={{
                            width: '794px',
                            height: '1123px',
                            transformOrigin: 'top left',
                            transform: `scale(${(500 / 794).toFixed(4)})`,
                            background: '#ffffff',
                            border: '3px solid #14225c',
                            boxSizing: 'border-box',
                            fontFamily: '"Segoe UI", Arial, sans-serif',
                            color: '#1a1a1a',
                            fontSize: '13px',
                            position: 'relative',
                            overflow: 'hidden',
                            padding: '32px 44px 0 44px',
                          }}>

                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                              <div style={{ color: '#0a2c66', fontSize: '26px', fontWeight: 800, marginBottom: '5px', letterSpacing: '0.3px' }}>
                                Futuristic Physio &amp; Wellness Hub
                              </div>
                              <div style={{ color: '#0c4dbc', fontSize: '17px', fontWeight: 800, letterSpacing: '0.5px' }}>
                                {doctorProfile?.full_name?.toUpperCase() || 'DR. JANE DOE'}
                              </div>
                              <div style={{ color: '#001b59', fontSize: '12.5px', fontWeight: 700, lineHeight: 1.55, marginTop: '7px' }}>
                                BPTH (KEM), MPTH (MSK), MANUAL &amp; MOVEMENT THERAPIST<br />
                                ADVANCED REHABILITATION SPECIALIST<br />
                                REG NO. {doctorProfile?.registration_number || '—'}
                              </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '2px solid #2f5bea', margin: '0 0 20px 0' }} />

                            {/* Patient Meta — two-column table layout matching PDF */}
                            <div style={{ marginBottom: '16px' }}>
                              {[
                                [['Name', (() => { const c = clients.find(c => c.id === rxClient); return c?.full_name || '—'; })()], ['Date', new Date().toLocaleDateString('en-GB')]],
                                [['Age/Sex', (() => { const c = clients.find(c => c.id === rxClient); if (!c?.date_of_birth) return '—'; const dob = new Date(c.date_of_birth); const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)); return `${age}y / ${c.gender?.[0]?.toUpperCase() || 'M'}`; })()], ['Mobile', (() => { const c = clients.find(c => c.id === rxClient); return c?.phone || '—'; })()]],
                                [['Office ID', (() => { const c = clients.find(c => c.id === rxClient); return c ? `MP${c.id.slice(0,6).toUpperCase()}` : '—'; })()], ['', '']],
                              ].map((row, ri) => (
                                <div key={ri} style={{ display: 'table', width: '100%', marginBottom: '10px' }}>
                                  {row.map(([label, val]) => (
                                    <div key={label} style={{ display: 'table-cell', width: '50%', fontSize: '13px' }}>
                                      {label && <><span style={{ fontWeight: 800, color: '#0a2c66', marginRight: '6px' }}>{label}:</span><span style={{ display: 'inline-block', borderBottom: '1.5px solid #6a8fe6', paddingBottom: '2px', minWidth: '160px' }}>{val}</span></>}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>

                            {/* Clinical Notes */}
                            <div style={{ marginBottom: '8px' }}>
                              {rxSymptoms && <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: 1.4 }}><span style={{ fontWeight: 800, color: '#0a2c66', display: 'inline-block', minWidth: '110px' }}>Symptoms:</span> {rxSymptoms}</p>}
                              {rxFindings && <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: 1.4 }}><span style={{ fontWeight: 800, color: '#0a2c66', display: 'inline-block', minWidth: '110px' }}>Findings:</span> {rxFindings}</p>}
                              {rxNotes && <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: 1.4 }}><span style={{ fontWeight: 800, color: '#0a2c66', display: 'inline-block', minWidth: '110px' }}>Notes:</span> {rxNotes}</p>}
                              <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: 1.4 }}>
                                <span style={{ fontWeight: 800, color: '#0a2c66', display: 'inline-block', minWidth: '110px' }}>Vitals:</span>
                                Pulse: {rxPulse || '—'} /min, SPO2: {rxSpo2 || '—'} %, BP: {rxBp || '—'} mmHg
                                {rxTemp ? `, Temp: ${rxTemp} °F` : ''}
                                {rxWeight ? `, Weight: ${rxWeight} kg` : ''}
                              </p>
                              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.4 }}><span style={{ fontWeight: 800, color: '#0a2c66', display: 'inline-block', minWidth: '110px' }}>Diagnosis:</span> {rxDiagnosis || <span style={{ color: '#aaa' }}>—</span>}</p>
                            </div>

                            {/* Medicines Table */}
                            {rxMedicines.length > 0 && (
                              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '18px 0 16px', fontSize: '12.5px' }}>
                                <thead>
                                  <tr style={{ background: '#eef2fc' }}>
                                    {[['Rx', '5%'], ['Name', ''], ['Frequency', ''], ['Duration', ''], ['Notes', '']].map(([h, w]) => (
                                      <th key={h} style={{ border: '1.5px solid #14225c', padding: '7px 9px', textAlign: 'left', color: '#0a2c66', fontWeight: 800, ...(w ? { width: w } : {}) }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rxMedicines.map((med, i) => (
                                    <tr key={i}>
                                      <td style={{ border: '1.5px solid #14225c', padding: '7px 9px', textAlign: 'center' }}>{i + 1}</td>
                                      <td style={{ border: '1.5px solid #14225c', padding: '7px 9px' }}>
                                        <strong>{med.name}</strong>
                                        {med.generic && <span style={{ fontVariant: 'small-caps', fontStyle: 'italic', color: '#333', fontSize: '11px', display: 'block', marginTop: '2px' }}>{med.generic}</span>}
                                      </td>
                                      <td style={{ border: '1.5px solid #14225c', padding: '7px 9px' }}>{med.frequency}</td>
                                      <td style={{ border: '1.5px solid #14225c', padding: '7px 9px' }}>{med.duration}</td>
                                      <td style={{ border: '1.5px solid #14225c', padding: '7px 9px' }}>{med.notes}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            {/* Instructions */}
                            {rxInstructions.length > 0 && (
                              <div style={{ fontSize: '13px', marginBottom: '22px' }}>
                                <span style={{ fontWeight: 800, color: '#0a2c66' }}>Instructions:</span>
                                <ul style={{ margin: '5px 0 0 0', paddingLeft: '22px' }}>
                                  {rxInstructions.map((inst, i) => <li key={i} style={{ marginBottom: '3px' }}>{inst}</li>)}
                                </ul>
                              </div>
                            )}

                            {/* Footer: contact + signature (table layout matching PDF) */}
                            <div style={{ display: 'table', width: '100%', marginTop: '26px', marginBottom: '110px' }}>
                              <div style={{ display: 'table-cell', width: '60%', verticalAlign: 'bottom' }}>
                                {[['☎', 'Phone', doctorProfile?.phone || '—'], ['✉', 'Email', doctorProfile?.email || '—'], ['♥', 'Instagram', '@FuturisticPhysio']].map(([icon, label, val]) => (
                                  <div key={label} style={{ marginBottom: '8px', fontSize: '12.5px' }}>
                                    <span style={{ display: 'inline-block', width: '24px', height: '24px', lineHeight: '24px', textAlign: 'center', borderRadius: '50%', background: '#0a2c66', color: '#fff', fontSize: '12px', marginRight: '7px', verticalAlign: 'middle' }}>{icon}</span>
                                    <span style={{ display: 'inline-block', verticalAlign: 'middle' }}><strong>{label}</strong><br />{val}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'table-cell', width: '40%', textAlign: 'center', verticalAlign: 'bottom' }}>
                                <div style={{ width: '170px', borderTop: '1.5px solid #333', margin: '0 auto 5px' }} />
                                <p style={{ fontWeight: 800, color: '#0a2c66', margin: 0, fontSize: '13px' }}>Signature</p>
                              </div>
                            </div>

                            {/* Decorative wave — same viewBox as PDF template */}
                            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, lineHeight: 0 }}>
                              <svg viewBox="0 0 1056 130" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '130px', display: 'block' }}>
                                <path d="M0,65 C180,28 340,102 560,65 C760,37 900,84 1056,46 L1056,110 L0,110 Z" fill="#447dfd" />
                                <path d="M0,92 C220,65 420,107 660,84 C840,65 950,98 1056,79 L1056,110 L0,110 Z" fill="#0a2358" />
                              </svg>
                            </div>

                          </div>{/* end A4 canvas */}
                        </div>{/* end scale wrapper */}
                      </div>
                    )}

                  </div>{/* end two-col grid */}
                </div>
              </div>
            )}

        {/* TAB 2: DOCTOR SETUP & PRACTICE SETTINGS */}
        {token && user?.role === "DOCTOR" && currentView === "doctor_setup" && (
          <div className="fade-in">
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '26px', color: 'var(--color-primary-text)', fontWeight: 800, margin: 0 }}>
                ⚙️ Doctor Setup &amp; Practice Settings
              </h1>
              <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
                Manage doctor profile photo, bio introduction, individual social media handle activations, practice service types, operating hours, and prescription templates.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '28px' }}>
              
              {/* Left Column: Doctor Profile & Service Types CRUD */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Section 0: Doctor Profile, Photo, Bio & Social Handles */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                    <h3 style={{ color: 'var(--color-primary-text)', margin: 0, fontSize: '16px' }}>Doctor Photo, Bio &amp; Profile</h3>
                  </div>

                  {/* Photo Preview Frame */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', background: 'var(--color-bg-surface-alt)', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--color-primary)' }}>
                      <img 
                        src={pictureUrl || "/static/uploads/doctor_default.png"} 
                        alt="Doctor Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).src = "/doctor_default.png"; }}
                      />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '13.5px', color: 'var(--color-primary-text)', fontWeight: 700 }}>Live Photo Preview</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>Displays to all clients on Doctor &amp; Client login pages.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveDoctorProfile}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px' }}>Doctor Picture URL</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="/static/uploads/doctor_default.png or image URL" 
                        value={pictureUrl} 
                        onChange={e => setPictureUrl(e.target.value)} 
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => setPictureUrl("/static/uploads/doctor_default.png")}
                        >
                          Use Generated Doctor Photo
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px' }}>Specialization Title</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Senior Physiotherapist & Wellness Specialist" 
                        value={docSpecialization} 
                        onChange={e => setDocSpecialization(e.target.value)} 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px' }}>Doctor Introduction / Bio</label>
                      <textarea 
                        className="form-textarea" 
                        rows={3} 
                        placeholder="Enter bio or introduction for patient login display..." 
                        value={bioText} 
                        onChange={e => setBioText(e.target.value)} 
                      />
                    </div>

                    {/* Social Media Links & Individual Handle Activations */}
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '12.5px', margin: 0, fontWeight: 700 }}>Social Media Handles &amp; Activation Toggles</label>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Activate only specific handles (e.g. Instagram &amp; Facebook only).</span>
                        </div>
                        <button 
                          type="button" 
                          className={`btn ${showSocialLinks ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '14px' }}
                          onClick={() => setShowSocialLinks(!showSocialLinks)}
                        >
                          {showSocialLinks ? '🟢 All Links Active' : '⚪ All Hidden'}
                        </button>
                      </div>

                      {/* LinkedIn */}
                      <div className="form-group" style={{ background: 'var(--color-bg-surface-alt)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label className="form-label" style={{ fontSize: '11.5px', margin: 0, fontWeight: 600 }}>🔗 LinkedIn URL</label>
                          <button 
                            type="button" 
                            className={`btn ${showLinkedin ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px' }}
                            onClick={() => setShowLinkedin(!showLinkedin)}
                          >
                            {showLinkedin ? '🟢 Active' : '⚪ Inactive'}
                          </button>
                        </div>
                        <input type="text" className="form-input" placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} />
                      </div>

                      {/* Instagram */}
                      <div className="form-group" style={{ background: 'var(--color-bg-surface-alt)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label className="form-label" style={{ fontSize: '11.5px', margin: 0, fontWeight: 600 }}>📸 Instagram URL</label>
                          <button 
                            type="button" 
                            className={`btn ${showInstagram ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px' }}
                            onClick={() => setShowInstagram(!showInstagram)}
                          >
                            {showInstagram ? '🟢 Active' : '⚪ Inactive'}
                          </button>
                        </div>
                        <input type="text" className="form-input" placeholder="https://instagram.com/..." value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} />
                      </div>

                      {/* Facebook */}
                      <div className="form-group" style={{ background: 'var(--color-bg-surface-alt)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label className="form-label" style={{ fontSize: '11.5px', margin: 0, fontWeight: 600 }}>📘 Facebook URL</label>
                          <button 
                            type="button" 
                            className={`btn ${showFacebook ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px' }}
                            onClick={() => setShowFacebook(!showFacebook)}
                          >
                            {showFacebook ? '🟢 Active' : '⚪ Inactive'}
                          </button>
                        </div>
                        <input type="text" className="form-input" placeholder="https://facebook.com/..." value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} />
                      </div>

                      {/* YouTube */}
                      <div className="form-group" style={{ background: 'var(--color-bg-surface-alt)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label className="form-label" style={{ fontSize: '11.5px', margin: 0, fontWeight: 600 }}>▶️ YouTube Channel URL</label>
                          <button 
                            type="button" 
                            className={`btn ${showYoutube ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px' }}
                            onClick={() => setShowYoutube(!showYoutube)}
                          >
                            {showYoutube ? '🟢 Active' : '⚪ Inactive'}
                          </button>
                        </div>
                        <input type="text" className="form-input" placeholder="https://youtube.com/@..." value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
                      </div>

                      {/* TrustPilot */}
                      <div className="form-group" style={{ background: 'var(--color-bg-surface-alt)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label className="form-label" style={{ fontSize: '11.5px', margin: 0, fontWeight: 600 }}>⭐ TrustPilot Review Page URL</label>
                          <button 
                            type="button" 
                            className={`btn ${showTrustpilot ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px' }}
                            onClick={() => setShowTrustpilot(!showTrustpilot)}
                          >
                            {showTrustpilot ? '🟢 Active' : '⚪ Inactive'}
                          </button>
                        </div>
                        <input type="text" className="form-input" placeholder="https://trustpilot.com/review/..." value={trustpilotUrl} onChange={e => setTrustpilotUrl(e.target.value)} />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                      💾 Save Profile &amp; Introduction
                    </button>
                  </form>
                </div>

                {/* Section A: Session Types CRUD */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                    <h3 style={{ color: 'var(--color-primary-text)', margin: 0, fontSize: '16px' }}>Add Service Type</h3>
                    {docSessionTypes.length > 0 && (
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        style={{ color: 'var(--color-danger)', borderColor: '#fca5a5', fontSize: '11.5px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={handleDeleteAllSessionTypes}
                        title="Shortcut to delete all created services"
                      >
                        <Trash2 size={13} />
                        Delete Services
                      </button>
                    )}
                  </div>
                  <form onSubmit={handleCreateSessionType}>
                    <div className="form-group">
                      <label className="form-label">Service Name</label>
                      <input type="text" className="form-input" required placeholder="e.g. Morning Yoga Class" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="form-select" value={newSessionCat} onChange={e => setNewSessionCat(e.target.value)}>
                        <option value="SESSION_PHYSIOTHERAPY">Physiotherapy (1:1)</option>
                        <option value="SESSION_YOGA">Yoga Session (Group)</option>
                        <option value="CONFERENCE">Conference (Group)</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Min Duration</label>
                        <input type="number" className="form-input" required value={newSessionDur} onChange={e => setNewSessionDur(Number(e.target.value))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Capacity</label>
                        <input type="number" className="form-input" required value={newSessionCap} onChange={e => setNewSessionCap(Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input type="text" className="form-input" placeholder="Optional details..." value={newSessionDesc} onChange={e => setNewSessionDesc(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location Address (Yoga &amp; Physio)</label>
                      <input type="text" className="form-input" placeholder="e.g. Futuristic Rehab &amp; Yoga Center, Suite 300" value={newSessionLocation} onChange={e => setNewSessionLocation(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Google Maps Tagged Link</label>
                      <input type="text" className="form-input" placeholder="https://maps.google.com/?q=..." value={newSessionMapUrl} onChange={e => setNewSessionMapUrl(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Service</button>
                  </form>

                  {/* List of Existing Created Services with Single Delete Shortcut buttons */}
                  {docSessionTypes.length > 0 && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                      <h4 style={{ fontSize: '13.5px', color: 'var(--color-primary-text)', marginBottom: '10px' }}>Created Services ({docSessionTypes.length})</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                        {docSessionTypes.map(st => (
                          <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-surface-alt)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-primary-text)' }}>{st.name}</span>
                              <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>({st.category})</span>
                            </div>
                            <button 
                              type="button" 
                              className="btn-link" 
                              style={{ color: 'var(--color-danger)', flexShrink: 0 }} 
                              onClick={() => handleDeleteSessionType(st.id)}
                              title="Delete this service"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Operating Hours Rules & Exceptions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Section B: Availability Rules */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                    <h3 style={{ color: 'var(--color-primary-text)', margin: 0, fontSize: '16px' }}>Set Availability Rules</h3>
                    {(docRules.length > 0 || docCalendarSlots.length > 0) && (
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        style={{ color: 'var(--color-danger)', borderColor: '#fca5a5', fontSize: '11.5px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={handleCancelAllAvailability}
                        title="Shortcut to cancel active availability while preserving booked time slots"
                      >
                        <Trash2 size={13} />
                        Cancel Availability
                      </button>
                    )}
                  </div>
                  <form onSubmit={handleCreateBulkRules}>
                    <div className="form-group">
                      <label className="form-label">Select Service / Session Type</label>
                      <select 
                        className="form-select" 
                        value={newRuleSessionType} 
                        onChange={e => {
                          const val = e.target.value;
                          setNewRuleSessionType(val);
                          const st = docSessionTypes.find(x => x.id === val);
                          if (st) {
                            if (st.category === "SESSION_YOGA" || st.category === "CONFERENCE" || st.category === "SESSION_PHYSIOTHERAPY") {
                              setRuleTypeMode("single");
                            }
                          }
                        }} 
                        required
                      >
                        <option value="">-- select service (Physiotherapy, Yoga, Conference...) --</option>
                        {docSessionTypes.map(st => (
                          <option key={st.id} value={st.id}>{st.name} ({st.category})</option>
                        ))}
                      </select>
                    </div>

                    {/* Rule Creation Mode Toggle (Single Session vs Recurring Availability) */}
                    <div className="form-group" style={{ marginBottom: '16px', background: 'var(--color-bg-surface-alt)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-primary-text)', marginBottom: '8px' }}>
                        Session Scheduling Type
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button 
                          type="button" 
                          className={`btn ${ruleTypeMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '12px', padding: '8px 10px', textAlign: 'center' }}
                          onClick={() => setRuleTypeMode("single")}
                        >
                          🎯 Single Session (Specific Date)
                        </button>
                        <button 
                          type="button" 
                          className={`btn ${ruleTypeMode === 'recurring' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '12px', padding: '8px 10px', textAlign: 'center' }}
                          onClick={() => setRuleTypeMode("recurring")}
                        >
                          🔄 Recurring Weekly Rules
                        </button>
                      </div>
                    </div>

                    {/* Date Input for Single Session vs Recurring Range */}
                    {ruleTypeMode === "single" ? (
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Single Session Date</label>
                        <input 
                          type="date" 
                          className="form-input" 
                          value={singleRuleDate} 
                          onChange={e => setSingleRuleDate(e.target.value)} 
                          required 
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label className="form-label">Rule Start Date</label>
                          <input type="date" className="form-input" value={newRuleValidFrom} onChange={e => setNewRuleValidFrom(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Rule End Date</label>
                          <input type="date" className="form-input" value={newRuleValidTo} onChange={e => setNewRuleValidTo(e.target.value)} required />
                        </div>
                      </div>
                    )}

                    {/* Custom Start / End Time Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Start Time</label>
                        <input type="time" className="form-input" value={newRuleStart} onChange={e => setNewRuleStart(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">End Time</label>
                        <input type="time" className="form-input" value={newRuleEnd} onChange={e => setNewRuleEnd(e.target.value)} required />
                      </div>
                    </div>

                    {/* Quick Weekday Selectors (Only for Recurring Rules) */}
                    {ruleTypeMode === "recurring" && (
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label className="form-label" style={{ margin: 0 }}>Select Days of Week</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button type="button" className="btn-link" style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }} onClick={() => setSelectedDays([0, 1, 2, 3, 4])}>Mon-Fri</button>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>|</span>
                            <button type="button" className="btn-link" style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }} onClick={() => setSelectedDays([5, 6])}>Weekend</button>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>|</span>
                            <button type="button" className="btn-link" style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }} onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}>All</button>
                          </div>
                        </div>

                        {/* Day toggle chips */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {[
                            { day: 0, label: 'Mon' },
                            { day: 1, label: 'Tue' },
                            { day: 2, label: 'Wed' },
                            { day: 3, label: 'Thu' },
                            { day: 4, label: 'Fri' },
                            { day: 5, label: 'Sat' },
                            { day: 6, label: 'Sun' }
                          ].map(d => {
                            const isSelected = selectedDays.includes(d.day);
                            return (
                              <button
                                key={d.day}
                                type="button"
                                className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '6px 10px', fontSize: '12px', minWidth: '42px', flex: 1 }}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedDays(selectedDays.filter(x => x !== d.day));
                                  } else {
                                    setSelectedDays([...selectedDays, d.day].sort());
                                  }
                                }}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                      {ruleTypeMode === 'single' ? '🎯 Create Single Session Slot' : '⚡ Save Weekly Availability & Open Slots'}
                    </button>
                  </form>

                  {/* Active Availability Rules List */}
                  {docRules.length > 0 && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                      <h4 style={{ fontSize: '14px', color: 'var(--color-primary-text)', marginBottom: '10px' }}>Active Configured Weekly Rules</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                        {docRules.map((rule: any) => {
                          const daysMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                          const stName = docSessionTypes.find(st => st.id === rule.session_type_id)?.name || 'Service';
                          return (
                            <div key={rule.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-surface-alt)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-primary-text)' }}>{daysMap[rule.day_of_week]}</span>
                                <span style={{ fontSize: '12.5px', marginLeft: '8px', color: 'var(--color-text-main)' }}>{rule.start_time.substring(0, 5)} - {rule.end_time.substring(0, 5)}</span>
                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)' }}>{stName}</span>
                              </div>
                              <button type="button" className="btn-link" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteRule(rule.id)}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section B2: Exceptions (Overrides) */}
                <div className="card">
                  <h3 style={{ color: 'var(--color-primary-text)', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', fontSize: '16px' }}>Add Schedule Exception</h3>
                  <form onSubmit={handleCreateException}>
                    <div className="form-group">
                      <label className="form-label">Target Date</label>
                      <input type="date" className="form-input" required value={newExcDate} onChange={e => setNewExcDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Filter to Service (Optional)</label>
                      <select className="form-select" value={newExcSessionType} onChange={e => setNewExcSessionType(e.target.value)}>
                        <option value="">All Services (Off Day)</option>
                        {docSessionTypes.map(st => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" checked={newExcBlocked} onChange={e => setNewExcBlocked(e.target.checked)} />
                      <label className="form-label">Block Entire Day</label>
                    </div>
                    {!newExcBlocked && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label">Custom Start</label>
                          <input type="time" className="form-input" value={newExcStart} onChange={e => setNewExcStart(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Custom End</label>
                          <input type="time" className="form-input" value={newExcEnd} onChange={e => setNewExcEnd(e.target.value)} />
                        </div>
                      </div>
                    )}
                    <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>Add Exception</button>
                  </form>
                </div>

              </div>

            </div>
          </div>
        )}
        
        {/* DOCTOR MEETING LINK MANAGEMENT MODAL */}
        {selectedAppointmentForMeeting && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div className="card fade-in" style={{
              maxWidth: '560px',
              width: '100%',
              background: 'var(--color-bg-surface)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '1px solid var(--color-border)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '20px', color: 'var(--color-primary-text)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Video size={22} style={{ color: 'var(--color-primary)' }} />
                  Online Consultation Meeting Link
                </h3>
                <button 
                  type="button" 
                  className="btn-link"
                  style={{ fontSize: '20px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                  onClick={() => setSelectedAppointmentForMeeting(null)}
                >
                  ✕
                </button>
              </div>

              {/* Patient & Appointment Details Summary */}
              <div style={{ background: 'var(--color-bg-surface-alt)', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13.5px' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11.5px' }}>Patient Name</span>
                    <strong style={{ color: 'var(--color-primary-text)' }}>{selectedAppointmentForMeeting.client_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11.5px' }}>Service Type</span>
                    <strong style={{ color: 'var(--color-primary-text)' }}>{selectedAppointmentForMeeting.session_type.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11.5px' }}>Date &amp; Time</span>
                    <strong>{new Date(selectedAppointmentForMeeting.slot.start_at).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11.5px' }}>Contact Email/Phone</span>
                    <span>{selectedAppointmentForMeeting.client_email || 'N/A'} {selectedAppointmentForMeeting.client_phone ? `(${selectedAppointmentForMeeting.client_phone})` : ''}</span>
                  </div>
                </div>
                {selectedAppointmentForMeeting.notes_from_client && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                    📝 Client Notes: "{selectedAppointmentForMeeting.notes_from_client}"
                  </div>
                )}
              </div>

              {/* Meeting Provider Selector */}
              <form onSubmit={handleSaveMeetingLink}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-primary-text)' }}>
                    Select Meeting Platform
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                    {[
                      { name: 'Google Meet', icon: '🔴', color: '#ea4335' },
                      { name: 'Zoom', icon: '🔵', color: '#2d8cff' },
                      { name: 'Microsoft Teams', icon: '🟣', color: '#6264a7' },
                      { name: 'Custom', icon: '🌐', color: '#10b981' }
                    ].map(p => {
                      const isSel = meetingProvider === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          className={`btn ${isSel ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '10px 6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            borderColor: isSel ? p.color : 'var(--color-border)',
                            background: isSel ? 'var(--color-primary-light)' : 'var(--color-bg-surface-alt)',
                            color: isSel ? 'var(--color-primary)' : 'var(--color-text-main)'
                          }}
                          onClick={() => {
                            setMeetingProvider(p.name);
                            setMeetingLinkInput(generateDefaultMeetingUrl(p.name, selectedAppointmentForMeeting.id));
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>{p.icon}</span>
                          <span style={{ whiteSpace: 'nowrap' }}>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Instant Link Generator & Input */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      Meeting URL ({meetingProvider})
                    </label>
                    <button
                      type="button"
                      className="btn-link"
                      style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setMeetingLinkInput(generateDefaultMeetingUrl(meetingProvider, selectedAppointmentForMeeting.id))}
                    >
                      ⚡ Auto-Generate Link
                    </button>
                  </div>

                  <input
                    type="url"
                    className="form-input"
                    required
                    placeholder={`https://${meetingProvider.toLowerCase().replace(/\s+/g, '')}.com/...`}
                    value={meetingLinkInput}
                    onChange={e => setMeetingLinkInput(e.target.value)}
                    style={{ fontSize: '13.5px', padding: '10px 14px' }}
                  />
                  <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px', margin: 0 }}>
                    Doctors can auto-generate standard links or paste personal room links from Zoom, Meet, or Teams.
                  </p>
                </div>

                {/* Calendar Sync & Export Tools */}
                <div style={{ background: 'var(--color-bg-surface-alt)', padding: '12px', borderRadius: '10px', marginBottom: '20px', border: '1px dashed var(--color-border)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-text)', display: 'block', marginBottom: '8px' }}>
                    📅 Calendar Sync &amp; Export
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a
                      href={getGoogleCalendarUrl(selectedAppointmentForMeeting)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} /> Add to Google Calendar ↗
                    </a>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => downloadIcsFile(selectedAppointmentForMeeting)}
                    >
                      <Download size={13} /> Download .ics File
                    </button>
                  </div>
                </div>

                {/* Submit & Close Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedAppointmentForMeeting(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSavingMeeting}
                    style={{ minWidth: '140px' }}
                  >
                    {isSavingMeeting ? 'Saving...' : '💾 Save Meeting Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* PATIENT REVIEW SUBMISSION MODAL */}
        {reviewModalAppt && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div className="card fade-in" style={{
              maxWidth: '500px',
              width: '100%',
              background: 'var(--color-bg-surface)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '1px solid var(--color-border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '19px', color: 'var(--color-primary-text)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={22} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                  Rate &amp; Review Your Session
                </h3>
                <button type="button" className="btn-link" style={{ fontSize: '20px', color: 'var(--color-text-muted)' }} onClick={() => setReviewModalAppt(null)}>
                  ✕
                </button>
              </div>

              <div style={{ background: 'var(--color-bg-surface-alt)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px' }}>
                <strong>Service:</strong> {reviewModalAppt.session_type.name} <br />
                <strong>Doctor:</strong> {reviewModalAppt.doctor_name} <br />
                <strong>Date:</strong> {new Date(reviewModalAppt.slot.start_at).toLocaleString()}
              </div>

              <form onSubmit={handleSaveReview}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, textAlign: 'center', display: 'block', marginBottom: '4px' }}>
                    Select Star Rating (1 being bad to 5 being good)
                  </label>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', margin: '0 0 12px 0' }}>
                    (1 to 5 stars: 1 being bad to 5 being good)
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          transform: reviewRating >= star ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setReviewRating(star)}
                      >
                        <Star size={32} style={{ fill: star <= reviewRating ? '#f59e0b' : 'none', color: star <= reviewRating ? '#f59e0b' : '#d1d5db' }} />
                      </button>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-text)', marginBottom: '16px' }}>
                    {reviewRating === 1 && "⭐ 1 Star - Bad"}
                    {reviewRating === 2 && "⭐⭐ 2 Stars - Poor"}
                    {reviewRating === 3 && "⭐⭐⭐ 3 Stars - Neutral"}
                    {reviewRating === 4 && "⭐⭐⭐⭐ 4 Stars - Good"}
                    {reviewRating === 5 && "⭐⭐⭐⭐⭐ 5 Stars - Excellent / Good"}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Write Your Comments or Feedback (Optional)
                  </label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Share how your treatment or session went with Dr. Jane Doe..."
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                  <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px', margin: 0 }}>
                    Reviews help improve clinic care and may be featured on our landing page.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setReviewModalAppt(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmittingReview} style={{ minWidth: '130px' }}>
                    {isSubmittingReview ? 'Submitting...' : '⭐ Submit Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PREVIEW PRESCRIPTION MODAL FOR DOCTOR/ADMIN */}
        {previewRxModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative' }}>
              <button type="button" className="btn-link" style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '18px', fontWeight: 'bold' }} onClick={() => setPreviewRxModal(null)}>
                ✕
              </button>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary-text)', margin: '0 0 6px 0' }}>
                📄 Prescription Record Preview
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
                Patient: {previewRxModal.client_name || 'Patient'} • Version #{previewRxModal.version} • Status: {previewRxModal.status}
              </p>

              <div style={{ background: 'var(--color-bg-surface-alt)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700 }}>🩺 Diagnosis: {previewRxModal.diagnosis}</p>
                {previewRxModal.content?.symptoms && <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}><strong>Symptoms:</strong> {previewRxModal.content.symptoms}</p>}
                {previewRxModal.content?.findings && <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}><strong>Findings:</strong> {previewRxModal.content.findings}</p>}
                {previewRxModal.content?.notes && <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}><strong>Notes:</strong> {previewRxModal.content.notes}</p>}
                {previewRxModal.content?.vitals && (
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
                    <strong>Vitals:</strong> Pulse: {previewRxModal.content.vitals.pulse || '—'}, SPO2: {previewRxModal.content.vitals.spo2 || '—'}%, BP: {previewRxModal.content.vitals.bp || '—'}, Temp: {previewRxModal.content.vitals.temp || '—'}°F, Weight: {previewRxModal.content.vitals.weight || '—'}kg
                  </p>
                )}
              </div>

              {previewRxModal.content?.medicines?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 700, margin: '0 0 8px 0' }}>💊 Medicines Prescribed</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-bg-surface-alt)' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid var(--color-border)' }}>Name</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid var(--color-border)' }}>Freq</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid var(--color-border)' }}>Duration</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid var(--color-border)' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRxModal.content.medicines.map((m, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '6px 8px', border: '1px solid var(--color-border)' }}><strong>{m.name}</strong> ({m.generic})</td>
                          <td style={{ padding: '6px 8px', border: '1px solid var(--color-border)' }}>{m.frequency}</td>
                          <td style={{ padding: '6px 8px', border: '1px solid var(--color-border)' }}>{m.duration}</td>
                          <td style={{ padding: '6px 8px', border: '1px solid var(--color-border)' }}>{m.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {previewRxModal.content?.instructions?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 700, margin: '0 0 6px 0' }}>📋 Special Instructions</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                    {previewRxModal.content.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPreviewRxModal(null)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={() => { const target = previewRxModal; setPreviewRxModal(null); handleEditPrescription(target); }}>✏️ Edit This Prescription</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
