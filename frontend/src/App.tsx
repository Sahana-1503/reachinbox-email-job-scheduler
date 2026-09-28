
import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  CalendarClock,
  Send,
  Mail,
  Upload,
  X,
  Clock,
  User,
  ChevronDown,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowLeft,
} from "lucide-react";

import "./index.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  senderId: string | null;
};

type Email = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: string;
};

function App() {
  const [activeTab, setActiveTab] =
    useState<"scheduled" | "sent">("scheduled");

  const [showCompose, setShowCompose] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [scheduled, setScheduled] =
    useState<Email[]>([]);

  const [sent, setSent] =
    useState<Email[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [recipients, setRecipients] =
    useState<string[]>([]);

  const [subject, setSubject] =
    useState("");

  const [body, setBody] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [delay, setDelay] =
    useState("2000");

  const [hourlyLimit, setHourlyLimit] =
    useState("200");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [selectedEmail, setSelectedEmail] =
    useState<Email | null>(null);

  const [searching, setSearching] =
    useState(false);

  const [searchResults, setSearchResults] =
    useState<Email[] | null>(null);

  // --------------------------------------------------
  // CURRENT GOOGLE USER
  // --------------------------------------------------

  async function loadCurrentUser() {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/me`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Not authenticated"
        );
      }

      const data =
        await response.json();

      if (!data.user) {
        throw new Error(
          "User information not found"
        );
      }

      setUser(data.user);
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

     window.location.href = `${API_URL}/api/auth/google`;
    } finally {
      setAuthLoading(false);
    }
  }

  // --------------------------------------------------
  // LOAD EMAILS
  // --------------------------------------------------

  async function loadEmails() {
    if (!user) return;

    try {
      setLoading(true);
      setError("");

      const [
        scheduledRes,
        sentRes,
      ] = await Promise.all([
        fetch(
          `${API_URL}/api/emails/scheduled?userId=${encodeURIComponent(
            user.id
          )}`,
          {
            credentials: "include",
          }
        ),

        fetch(
          `${API_URL}/api/emails/sent?userId=${encodeURIComponent(
            user.id
          )}`,
          {
            credentials: "include",
          }
        ),
      ]);

      if (
        !scheduledRes.ok ||
        !sentRes.ok
      ) {
        throw new Error(
          "Failed to load emails"
        );
      }

      const scheduledData =
        await scheduledRes.json();

      const sentData =
        await sentRes.json();

      setScheduled(
        scheduledData.emails || []
      );

      setSent(
        sentData.emails || []
      );
    } catch (error) {
      console.error(
        "Email loading error:",
        error
      );

      setError(
        "Could not connect to backend."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // INITIAL AUTHENTICATION
  // --------------------------------------------------

  useEffect(() => {
    loadCurrentUser();
  }, []);

  // --------------------------------------------------
  // LOAD EMAILS AFTER USER IS AVAILABLE
  // --------------------------------------------------

  useEffect(() => {
    if (user) {
      loadEmails();
    }
  }, [user]);

  // --------------------------------------------------
  // CONNECT SLACK
  // --------------------------------------------------

  async function handleConnectSlack() {
    try {
      setError("");
      setMessage("");

      /*
       * Make sure we have the latest authenticated
       * user from the backend.
       */

      const response = await fetch(
        `${API_URL}/api/auth/me`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        alert(
          "Your Google login has expired. Please login again."
        );

        window.location.href =
          `${API_URL}/api/auth/google`;

        return;
      }

      const data =
        await response.json();

      if (!data.user?.id) {
        alert(
          "Could not find your logged-in user."
        );

        return;
      }

      /*
       * Save latest user information.
       */

      setUser(data.user);

      /*
       * Start Slack OAuth.
       */

      const slackUrl =
        `${API_URL}/api/slack/connect?userId=${encodeURIComponent(
          data.user.id
        )}`;

      console.log(
        "Starting Slack OAuth:",
        slackUrl
      );

      window.location.assign(
        slackUrl
      );
    } catch (error) {
      console.error(
        "Slack connection error:",
        error
      );

      alert(
        "Could not connect to Slack. Make sure the backend is running on port 5000."
      );
    }
  }

  // --------------------------------------------------
  // HANDLE SLACK CALLBACK MESSAGE
  // --------------------------------------------------

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const slackStatus =
      params.get("slack");

    if (slackStatus === "connected") {
      setMessage(
        "Slack connected successfully."
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    if (slackStatus === "error") {
      setError(
        "Slack connection failed."
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, []);

  // --------------------------------------------------
  // SCHEDULE EMAILS
  // --------------------------------------------------

  async function handleSchedule() {
    setError("");
    setMessage("");

    if (!user) {
      setError(
        "You are not authenticated."
      );

      return;
    }

    if (!user.senderId) {
      setError(
        "No sender account is configured."
      );

      return;
    }

    if (!recipients.length) {
      setError(
        "Please upload a CSV/TXT file containing email addresses."
      );

      return;
    }

    if (!subject.trim()) {
      setError(
        "Subject is required."
      );

      return;
    }

    if (!body.trim()) {
      setError(
        "Email body is required."
      );

      return;
    }

    if (!startTime) {
      setError(
        "Please select a start time."
      );

      return;
    }

    const selectedTime =
      new Date(startTime);

    if (
      selectedTime.getTime() <=
      Date.now()
    ) {
      setError(
        "Please select a future date and time."
      );

      return;
    }

    try {
      const response =
        await fetch(
          `${API_URL}/api/emails/schedule`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              userId: user.id,

              senderId:
                user.senderId,

              recipients,

              subject,

              body,

              startTime:
                selectedTime.toISOString(),

              delayBetweenEmails:
                Number(delay),

              hourlyLimit:
                Number(hourlyLimit),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Scheduling failed"
        );
      }

      setMessage(
        `${recipients.length} email(s) scheduled successfully.`
      );

      setShowCompose(false);

      setRecipients([]);

      setSubject("");

      setBody("");

      setStartTime("");

      await loadEmails();
    } catch (error) {
      console.error(
        "Scheduling error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Scheduling failed."
      );
    }
  }

  // --------------------------------------------------
  // CSV / TXT FILE
  // --------------------------------------------------

  function handleFile(file: File) {
    const reader =
      new FileReader();

    reader.onload = () => {
      const text =
        String(
          reader.result || ""
        );

      const matches =
        text.match(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
        ) || [];

      const unique = [
        ...new Set(
          matches.map(
            (email) =>
              email.toLowerCase()
          )
        ),
      ];

      setRecipients(unique);

      if (unique.length) {
        setError("");

        setMessage(
          `${unique.length} email address(es) detected.`
        );
      } else {
        setError(
          "No email addresses found in this file."
        );
      }
    };

    reader.readAsText(file);
  }

  // --------------------------------------------------
  // ELASTICSEARCH SEARCH
  // --------------------------------------------------

  useEffect(() => {
    if (!user) return;

    const q = search.trim();

    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);

        const response = await fetch(
          `${API_URL}/api/search?userId=${encodeURIComponent(
            user.id
          )}&q=${encodeURIComponent(q)}&status=${encodeURIComponent(
            activeTab === "scheduled" ? "SCHEDULED" : "SENT"
          )}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Elasticsearch search failed");
        }

        const data = await response.json();

        const rawResults =
          data.emails ??
          data.results ??
          data.hits ??
          [];

        const normalized: Email[] = rawResults
          .map((item: any) => {
            const source = item?._source ?? item;
            return {
              id: source.id ?? item.id,
              recipient: source.recipient ?? "",
              subject: source.subject ?? "",
              body: source.body ?? "",
              scheduledAt:
                source.scheduledAt ??
                source.scheduled_at ??
                new Date().toISOString(),
              sentAt:
                source.sentAt ??
                source.sent_at ??
                null,
              status: source.status ?? "",
            };
          })
          .filter((email: Email) => Boolean(email.id));

        setSearchResults(normalized);
      } catch (err) {
        console.warn(
          "Elasticsearch search unavailable; using local fallback.",
          err
        );

        const list =
          activeTab === "scheduled"
            ? scheduled
            : sent;

        const qLower = q.toLowerCase();

        setSearchResults(
          list.filter(
            (email) =>
              email.recipient.toLowerCase().includes(qLower) ||
              email.subject.toLowerCase().includes(qLower) ||
              email.body.toLowerCase().includes(qLower)
          )
        );
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, activeTab, user, scheduled, sent]);

  const visibleEmails =
    search.trim()
      ? searchResults ?? []
      : activeTab === "scheduled"
        ? scheduled
        : sent;

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      setUser(null);
      window.location.href = `${API_URL}/api/auth/google`;
    }
  }

  // --------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div>
          <div className="brand-mark">
            O
          </div>

          <h2>
            Loading your workspace...
          </h2>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        {/* BRAND */}

        <div className="brand">
          <div className="brand-mark">
            O
          </div>

          <span>
            ONG
          </span>
        </div>

        {/* COMPOSE */}

        <button
          className="compose-button"
          onClick={() => {
            setShowCompose(true);
            setMessage("");
            setError("");
          }}
        >
          <Plus size={18} />

          Compose New Email
        </button>

        {/* NAVIGATION */}

        <nav className="nav">

          <button
            className={
              activeTab === "scheduled"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveTab(
                "scheduled"
              )
            }
          >
            <CalendarClock
              size={18}
            />

            <span>
              Scheduled
            </span>

            <b>
              {scheduled.length}
            </b>
          </button>

          <button
            className={
              activeTab === "sent"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveTab("sent")
            }
          >
            <Send size={18} />

            <span>
              Sent
            </span>

            <b>
              {sent.length}
            </b>
          </button>

        </nav>

        {/* PROFILE + SLACK */}

        <div className="sidebar-bottom">

          <div className="profile">

            {user?.avatar ? (
              <img
                className="avatar profile-image"
                src={user.avatar}
                alt={
                  user.name
                }
              />
            ) : (
              <div className="avatar">
                {user?.name
                  ?.charAt(0)
                  .toUpperCase() ||
                  "S"}
              </div>
            )}

            <div className="profile-info">

              <strong>
                {user?.name ||
                  "Loading..."}
              </strong>

              <span>
                {user?.email || ""}
              </span>

            </div>

            <ChevronDown
              size={16}
            />

          </div>

          <button
            type="button"
            className="slack-connect-btn"
            onClick={
              handleConnectSlack
            }
          >
            Connect Slack
          </button>

          <button
            type="button"
            className="logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={15} />
            Sign out
          </button>

        </div>

      </aside>

      {/* MAIN */}

      <main className="main">

        {/* TOP BAR */}

        <header className="topbar">

          <div>

            <h1>
              {activeTab ===
              "scheduled"
                ? "Scheduled Emails"
                : "Sent Emails"}
            </h1>

            <p>
              {activeTab ===
              "scheduled"
                ? "Manage your upcoming email campaigns"
                : "View emails that have already been processed"}
            </p>

          </div>

          <div className="top-actions">

            <div className="search">

              <Search size={18} />

              <input
                placeholder="Search emails..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

            </div>

            <button
              className="top-compose"
              onClick={() => {
                setShowCompose(true);
                setMessage("");
                setError("");
              }}
            >
              <Plus size={17} />

              Compose
            </button>

          </div>

        </header>

        {/* SUCCESS */}

        {message && (
          <div className="success-banner">

            <CheckCircle2
              size={18}
            />

            {message}

          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="error-banner">

            <AlertCircle
              size={18}
            />

            {error}

          </div>
        )}

        {/* STATS */}

        <section className="stats">

          <div className="stat-card">

            <div className="stat-icon green">
              <CalendarClock
                size={20}
              />
            </div>

            <div>

              <span>
                Scheduled
              </span>

              <strong>
                {scheduled.length}
              </strong>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon blue">
              <Send size={20} />
            </div>

            <div>

              <span>
                Sent
              </span>

              <strong>
                {sent.length}
              </strong>

            </div>

          </div>

        </section>

        {/* EMAIL TABLE */}

        <section className="email-panel">

          <div className="panel-header">

            <div>

              <h2>
                {activeTab ===
                "scheduled"
                  ? "Scheduled Emails"
                  : "Sent Emails"}
              </h2>

              <span>
                {searching
                  ? "Searching Elasticsearch..."
                  : `${visibleEmails.length} email${
                      visibleEmails.length === 1 ? "" : "s"
                    }`}
              </span>

            </div>

          </div>

          <div className="email-header">

            <span>
              RECIPIENT
            </span>

            <span>
              SUBJECT
            </span>

            <span>
              {activeTab ===
              "scheduled"
                ? "SCHEDULED TIME"
                : "SENT TIME"}
            </span>

            <span>
              STATUS
            </span>

          </div>

          {loading ? (

            <div className="empty">

              <Mail size={34} />

              <h3>
                Loading emails...
              </h3>

            </div>

          ) : visibleEmails.length ===
            0 ? (

            <div className="empty">

              <div className="empty-icon">

                <Mail size={30} />

              </div>

              <h3>
                No {activeTab} emails
              </h3>

              <p>
                {activeTab ===
                "scheduled"
                  ? "Create your first scheduled email campaign."
                  : "Sent emails will appear here."}
              </p>

              {activeTab ===
                "scheduled" && (

                <button
                  className="empty-button"
                  onClick={() =>
                    setShowCompose(
                      true
                    )
                  }
                >
                  <Plus size={17} />

                  Compose New Email
                </button>

              )}

            </div>

          ) : (

            <div className="email-list">

              {visibleEmails.map(
                (email) => (

                  <div
                    className="email-row email-row-clickable"
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedEmail(email);
                      }
                    }}
                  >

                    <div className="recipient">

                      <div className="small-avatar">

                        {email.recipient
                          .charAt(0)
                          .toUpperCase()}

                      </div>

                      <span>
                        {email.recipient}
                      </span>

                    </div>

                    <div className="subject">

                      <strong>
                        {email.subject}
                      </strong>

                      <span>
                        {email.body.slice(
                          0,
                          55
                        )}
                      </span>

                    </div>

                    <div className="time">

                      <Clock
                        size={15}
                      />

                      {new Date(
                        activeTab ===
                        "scheduled"
                          ? email.scheduledAt
                          : email.sentAt ||
                            email.scheduledAt
                      ).toLocaleString()}

                    </div>

                    <div>

                      <span
                        className={`status ${email.status.toLowerCase()}`}
                      >
                        {email.status}
                      </span>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

      {/* EMAIL DETAIL */}

      {selectedEmail && (
        <div
          className="modal-overlay detail-overlay"
          onClick={() => setSelectedEmail(null)}
        >
          <div
            className="email-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="detail-header">
              <button
                type="button"
                className="detail-back"
                onClick={() => setSelectedEmail(null)}
              >
                <ArrowLeft size={18} />
                Back
              </button>

              <span
                className={`status ${selectedEmail.status.toLowerCase()}`}
              >
                {selectedEmail.status}
              </span>
            </div>

            <div className="detail-content">
              <div className="detail-title-row">
                <div>
                  <span className="detail-label">
                    {activeTab === "scheduled"
                      ? "SCHEDULED EMAIL"
                      : "SENT EMAIL"}
                  </span>
                  <h2>{selectedEmail.subject}</h2>
                </div>
              </div>

              <div className="detail-meta">
                <div className="detail-meta-item">
                  <span>TO</span>
                  <strong>{selectedEmail.recipient}</strong>
                </div>

                <div className="detail-meta-item">
                  <span>
                    {activeTab === "scheduled"
                      ? "SCHEDULED TIME"
                      : "SENT TIME"}
                  </span>
                  <strong>
                    {new Date(
                      activeTab === "scheduled"
                        ? selectedEmail.scheduledAt
                        : selectedEmail.sentAt ||
                          selectedEmail.scheduledAt
                    ).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="detail-divider" />

              <div className="detail-body">
                <div className="detail-body-label">MESSAGE</div>
                <div className="detail-message">
                  {selectedEmail.body}
                </div>
              </div>

              <div className="detail-id">
                <span>Email ID</span>
                <code>{selectedEmail.id}</code>
              </div>
            </div>

            <div className="detail-footer">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setSelectedEmail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPOSE MODAL */}

      {showCompose && (

        <div className="modal-overlay">

          <div className="compose-modal">

            <div className="compose-header">

              <div>

                <h2>
                  Compose New Email
                </h2>

                <p>
                  Create and schedule an email campaign
                </p>

              </div>

              <button
                className="icon-button"
                onClick={() =>
                  setShowCompose(false)
                }
              >
                <X size={20} />
              </button>

            </div>

            <div className="compose-content">

              {/* FROM */}

              <label>

                From

                <div className="input-box">

                  <User size={17} />

                  {user?.name}

                  {" <"}

                  {user?.email}

                  {">"}

                  <ChevronDown
                    size={16}
                  />

                </div>

              </label>

              {/* UPLOAD */}

              <label>

                Upload email list

                <label className="upload-box">

                  <Upload
                    size={22}
                  />

                  <strong>
                    Upload CSV or TXT
                  </strong>

                  <span>
                    We'll automatically detect email addresses
                  </span>

                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {

                      const file =
                        e.target.files?.[0];

                      if (file) {
                        handleFile(file);
                      }

                    }}
                  />

                </label>

              </label>

              {/* RECIPIENT PREVIEW */}

              {recipients.length >
                0 && (

                <div className="recipient-preview">

                  <div className="recipient-title">

                    <span>
                      Detected recipients
                    </span>

                    <strong>
                      {
                        recipients.length
                      }
                    </strong>

                  </div>

                  <div className="chips">

                    {recipients
                      .slice(0, 8)
                      .map(
                        (email) => (

                          <span
                            className="chip"
                            key={email}
                          >
                            {email}
                          </span>

                        )
                      )}

                    {recipients.length >
                      8 && (

                      <span className="chip more">

                        +
                        {recipients.length -
                          8}

                      </span>

                    )}

                  </div>

                </div>

              )}

              {/* SUBJECT */}

              <label>

                Subject

                <input
                  className="text-input"
                  placeholder="Enter email subject"
                  value={subject}
                  onChange={(e) =>
                    setSubject(
                      e.target.value
                    )
                  }
                />

              </label>

              {/* DELAY + LIMIT */}

              <div className="two-columns">

                <label>

                  Delay between emails

                  <div className="input-with-unit">

                    <input
                      type="number"
                      min="0"
                      value={delay}
                      onChange={(e) =>
                        setDelay(
                          e.target.value
                        )
                      }
                    />

                    <span>
                      ms
                    </span>

                  </div>

                </label>

                <label>

                  Hourly limit

                  <div className="input-with-unit">

                    <input
                      type="number"
                      min="1"
                      value={
                        hourlyLimit
                      }
                      onChange={(e) =>
                        setHourlyLimit(
                          e.target.value
                        )
                      }
                    />

                    <span>
                      emails/hour
                    </span>

                  </div>

                </label>

              </div>

              {/* START TIME */}

              <label>

                Schedule start time

                <input
                  className="text-input"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) =>
                    setStartTime(
                      e.target.value
                    )
                  }
                />

              </label>

              {/* BODY */}

              <label>

                Email body

                <textarea
                  className="body-input"
                  placeholder="Write your email..."
                  value={body}
                  onChange={(e) =>
                    setBody(
                      e.target.value
                    )
                  }
                />

              </label>

              {/* ATTACHMENT */}

              <div className="attachment">

                <Paperclip
                  size={17}
                />

                <span>
                  No attachment
                </span>

              </div>

            </div>

            {/* FOOTER */}

            <div className="compose-footer">

              <button
                className="cancel-button"
                onClick={() =>
                  setShowCompose(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                className="schedule-button"
                onClick={
                  handleSchedule
                }
              >
                <CalendarClock
                  size={17}
                />

                Schedule Emails
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;