import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function CreateCommunity() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [membershipType, setMembershipType] = useState("open");

  const [approvalType, setApprovalType] = useState("question");
  const [approvalQuestion, setApprovalQuestion] = useState("");
  const [approvalChoices, setApprovalChoices] = useState(["", "", "", ""]);
  const [approvalCorrectAnswer, setApprovalCorrectAnswer] = useState("");

  const [nameStatus, setNameStatus] = useState(null);
  const [checkingName, setCheckingName] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  const cleanName = name.trim();

  const nameIsValid =
    cleanName.length >= 3 &&
    cleanName.length <= 30 &&
    !cleanName.includes("@");

  const cleanChoices = approvalChoices
    .map((choice) => choice.trim())
    .filter(Boolean);

  const quizIsValid =
    approvalType !== "quiz" ||
    (cleanChoices.length >= 2 && approvalCorrectAnswer);

  const approvalIsValid =
    membershipType !== "restricted" ||
    approvalQuestion.trim().length > 0;

  const formIsValid =
    nameIsValid &&
    nameStatus === "available" &&
    approvalIsValid &&
    quizIsValid;

  useEffect(() => {
    const checkCommunityName = async () => {
      if (!nameIsValid) {
        setNameStatus(null);
        return;
      }

      setCheckingName(true);

      const { data, error } = await supabase
        .from("communities")
        .select("id")
        .ilike("name", cleanName)
        .maybeSingle();

      setCheckingName(false);

      if (error) {
        console.error("COMMUNITY NAME CHECK ERROR:", error);
        setNameStatus(null);
        return;
      }

      setNameStatus(data ? "taken" : "available");
    };

    const timeout = setTimeout(checkCommunityName, 300);

    return () => clearTimeout(timeout);
  }, [cleanName, nameIsValid]);

  const handleCreate = async () => {
    setErrorMsg("");

    if (!formIsValid) {
      setErrorMsg("Please complete all required fields.");
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      setLoading(false);
      setErrorMsg("You must be logged in to create a community.");
      return;
    }

    const { data, error } = await supabase
      .from("communities")
      .insert({
        name: cleanName,
        description: description.trim() || null,
        membership_type: membershipType,
        approval_type: membershipType === "restricted" ? approvalType : null,
        approval_question:
          membershipType === "restricted"
            ? approvalQuestion.trim() || null
            : null,
        approval_choices:
          membershipType === "restricted" && approvalType === "quiz"
            ? cleanChoices
            : [],
        approval_correct_answer:
          membershipType === "restricted" && approvalType === "quiz"
            ? approvalCorrectAnswer
            : null,
        created_by: user.id,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setErrorMsg("That community name is already taken.");
      } else {
        setErrorMsg(error.message);
      }

      return;
    }

    navigate(`/c/${data.id}`);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Create a Community</h2>

      <p style={styles.subtitle}>
        Tell us about your Community. You can always change this later.
      </p>

      <label style={styles.label}>Community name</label>
      <input
        placeholder="Gaming"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setErrorMsg("");
        }}
        style={{
          ...styles.input,
          border:
            name &&
            (!nameIsValid || nameStatus === "taken")
              ? "1px solid #d93025"
              : "1px solid #ddd",
        }}
      />

      <div
        style={{
          ...styles.helper,
          color:
            name && (!nameIsValid || nameStatus === "taken")
              ? "#d93025"
              : nameStatus === "available"
              ? "#137333"
              : "#777",
        }}
      >
        {!name
          ? "Names must be 3–30 characters and cannot include @usernames."
          : !nameIsValid
          ? "Names must be 3–30 characters and cannot include @usernames."
          : checkingName
          ? "Checking name..."
          : nameStatus === "taken"
          ? "That community name is already taken."
          : nameStatus === "available"
          ? "✅ Community name is available."
          : "Names must be 3–30 characters and cannot include @usernames."}
      </div>

      <label style={styles.label}>Description (optional)</label>
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={styles.textarea}
      />

      <label style={styles.label}>Membership type</label>

      <div style={styles.membershipBox}>
        <button
          type="button"
          onClick={() => setMembershipType("open")}
          style={styles.membershipOption}
        >
          <div>
            <div style={styles.membershipTitle}>Open</div>
            <div style={styles.membershipDesc}>
              Anyone can discover and join your community.
            </div>
          </div>

          <div style={styles.radioCircle}>
            {membershipType === "open" ? "✓" : ""}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMembershipType("restricted")}
          style={styles.membershipOption}
        >
          <div>
            <div style={styles.membershipTitle}>Restricted</div>
            <div style={styles.membershipDesc}>
              People must ask to join, and the mod team must approve those requests.
            </div>
          </div>

          <div style={styles.radioCircle}>
            {membershipType === "restricted" ? "✓" : ""}
          </div>
        </button>
      </div>

      {membershipType === "restricted" && (
        <>
          <label style={styles.label}>Approval type</label>

          <div style={styles.membershipBox}>
            <button
              type="button"
              onClick={() => setApprovalType("question")}
              style={styles.membershipOption}
            >
              <div>
                <div style={styles.membershipTitle}>Question</div>
                <div style={styles.membershipDesc}>
                  People answer a short question before joining.
                </div>
              </div>

              <div style={styles.radioCircle}>
                {approvalType === "question" ? "✓" : ""}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setApprovalType("quiz")}
              style={styles.membershipOption}
            >
              <div>
                <div style={styles.membershipTitle}>Quiz</div>
                <div style={styles.membershipDesc}>
                  People choose from answer choices before joining.
                </div>
              </div>

              <div style={styles.radioCircle}>
                {approvalType === "quiz" ? "✓" : ""}
              </div>
            </button>
          </div>

          <label style={styles.label}>
            {approvalType === "quiz"
              ? "Approval quiz"
              : "Approval question"}
          </label>

          <textarea
            placeholder={
              approvalType === "quiz"
                ? "Example: What is the secret word?"
                : "Example: Why do you want to join this community?"
            }
            value={approvalQuestion}
            onChange={(e) => setApprovalQuestion(e.target.value)}
            style={styles.textarea}
          />

          {approvalType === "quiz" && (
            <>
              <label style={styles.label}>Answer choices</label>

              {approvalChoices.map((choice, index) => (
                <input
                  key={index}
                  placeholder={`Choice ${index + 1}`}
                  value={choice}
                  onChange={(e) => {
                    const updated = [...approvalChoices];
                    updated[index] = e.target.value;
                    setApprovalChoices(updated);

                    if (approvalCorrectAnswer === choice) {
                      setApprovalCorrectAnswer("");
                    }
                  }}
                  style={styles.input}
                />
              ))}

              <label style={styles.label}>Correct answer</label>

              <select
                value={approvalCorrectAnswer}
                onChange={(e) => setApprovalCorrectAnswer(e.target.value)}
                style={styles.select}
              >
                <option value="">Select correct answer</option>

                {approvalChoices.map((choice, index) => {
                  const cleanChoice = choice.trim();

                  if (!cleanChoice) return null;

                  return (
                    <option key={index} value={cleanChoice}>
                      {cleanChoice}
                    </option>
                  );
                })}
              </select>
            </>
          )}
        </>
      )}

      {errorMsg && <p style={styles.error}>{errorMsg}</p>}

      <button
        onClick={handleCreate}
        style={{
          ...styles.button,
          opacity: loading || !formIsValid ? 0.6 : 1,
        }}
        disabled={loading || !formIsValid}
      >
        {loading ? "Creating..." : "Create"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "500px",
    width: "100%",
    margin: "0 auto",
    padding: "20px",
    minHeight: "100vh",
    boxSizing: "border-box",
  },

  title: {
    margin: "0 0 6px",
    textAlign: "center",
  },

  subtitle: {
    fontSize: "14px",
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 1.5,
    marginBottom: "18px",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "6px",
  },

  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "6px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    boxSizing: "border-box",
  },

  helper: {
    fontSize: "12px",
    marginBottom: "12px",
  },

  textarea: {
    width: "100%",
    padding: "10px",
    height: "100px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    resize: "vertical",
    boxSizing: "border-box",
  },

  select: {
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    boxSizing: "border-box",
  },

  membershipBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginBottom: "12px",
  },

  membershipOption: {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: "8px 0",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    textAlign: "left",
  },

  membershipTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#56566f",
    marginBottom: "2px",
  },

  membershipDesc: {
    fontSize: "12px",
    color: "#666",
    lineHeight: 1.35,
  },

  radioCircle: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "2px solid #7c7c8a",
    color: "#56566f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "700",
    flexShrink: 0,
  },

  button: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    width: "100%",
    fontWeight: "600",
  },

  error: {
    color: "#b00020",
    fontSize: "13px",
    margin: "0 0 10px",
  },
};