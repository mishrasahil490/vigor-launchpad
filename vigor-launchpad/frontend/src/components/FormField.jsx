export default function FormField({ label, children, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
