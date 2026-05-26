export default function PostSkeleton() {
  return (
    <div className="card">
      {/* Avatar + name row */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <div
          className="skeleton"
          style={{ width: "40px", height: "40px", borderRadius: "50%" }}
        />
        <div style={{ flex: 1 }}>
          <div
            className="skeleton"
            style={{ width: "120px", height: "12px", marginBottom: "6px" }}
          />
          <div
            className="skeleton"
            style={{ width: "80px", height: "10px" }}
          />
        </div>
      </div>

      {/* Content lines */}
      <div
        className="skeleton"
        style={{ width: "100%", height: "12px", marginBottom: "6px" }}
      />
      <div
        className="skeleton"
        style={{ width: "90%", height: "12px", marginBottom: "6px" }}
      />
      <div
        className="skeleton"
        style={{ width: "70%", height: "12px", marginBottom: "10px" }}
      />

      {/* Buttons row */}
      <div style={{ display: "flex", gap: "10px" }}>
        <div className="skeleton" style={{ width: "60px", height: "24px" }} />
        <div className="skeleton" style={{ width: "80px", height: "24px" }} />
      </div>
    </div>
  );
}