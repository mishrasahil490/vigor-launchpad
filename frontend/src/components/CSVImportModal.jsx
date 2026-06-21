import { useRef, useState } from "react";
import { Upload, X, ArrowRight, CheckCircle, AlertCircle, FileText } from "lucide-react";
import api from "../api/client";

const MODULE_CONFIGS = {
  influencers: {
    label: "Creators / Influencers",
    apiPath: "/influencers/bulk",
    requiredField: "creatorName",
    fields: [
      { key: "creatorName",               label: "Creator Name",              required: true  },
      { key: "instagramHandle",           label: "Instagram Handle",          required: false },
      { key: "youtubeChannel",            label: "YouTube Channel",           required: false },
      { key: "category",                  label: "Category",                  required: false },
      { key: "tier",                      label: "Tier",                      required: false },
      { key: "followers",                 label: "Followers",                 required: false },
      { key: "engagementRate",            label: "Engagement Rate (%)",       required: false },
      { key: "gender",                    label: "Gender",                    required: false },
      { key: "location",                  label: "Location / City",           required: false },
      { key: "language",                  label: "Language",                  required: false },
      { key: "contactNumber",             label: "Contact Number",            required: false },
      { key: "email",                     label: "Email",                     required: false },
      { key: "managerDetails",            label: "Manager Details",           required: false },
      { key: "commercialCost",            label: "Commercial Cost (₹)",       required: false },
      { key: "reelCost",                  label: "Reel Cost (₹)",             required: false },
      { key: "storyCost",                 label: "Story Cost (₹)",            required: false },
      { key: "adRightsCost",              label: "Ad Rights Cost (₹)",        required: false },
      { key: "eventAppearanceCost",       label: "Event Appearance Cost (₹)", required: false },
      { key: "previousBrandCollaborations", label: "Previous Brand Collabs",  required: false },
      { key: "portfolioLinks",            label: "Portfolio / Instagram URL", required: false },
      { key: "contentSamples",            label: "Content Samples URL",       required: false },
    ],
    numericFields: new Set([
      "followers", "engagementRate", "commercialCost",
      "reelCost", "storyCost", "adRightsCost", "eventAppearanceCost",
    ]),
    aliases: {
      creatorName:               ["creator name", "creator", "name", "influencer name", "influencer", "full name", "creator_name"],
      instagramHandle:           ["instagram", "instagram handle", "ig handle", "ig", "insta", "instagram_handle"],
      youtubeChannel:            ["youtube", "yt", "youtube channel", "youtube_channel"],
      category:                  ["category", "niche", "content type", "type"],
      tier:                      ["tier", "level", "influencer tier"],
      followers:                 ["followers", "follower count", "total followers", "ig followers", "followers count"],
      engagementRate:            ["engagement", "engagement rate", "er", "engagement %", "engagement_rate"],
      gender:                    ["gender", "sex"],
      location:                  ["location", "city", "state", "place", "city/state"],
      language:                  ["language", "lang", "languages"],
      contactNumber:             ["contact", "phone", "mobile", "number", "contact number", "phone number", "contact_number"],
      email:                     ["email", "email id", "e-mail", "mail"],
      managerDetails:            ["manager", "talent manager", "agency", "manager details", "manager_details"],
      commercialCost:            ["commercial", "cost", "rate", "price", "commercial cost", "fees", "fee", "commercial_cost"],
      reelCost:                  ["reel", "reel cost", "reel price", "reel rate", "reel_cost"],
      storyCost:                 ["story", "story cost", "story rate", "story_cost"],
      adRightsCost:              ["ad rights", "ad rights cost", "adrights", "ad_rights_cost"],
      eventAppearanceCost:       ["event", "appearance", "event cost", "event_appearance_cost"],
      previousBrandCollaborations: ["brands", "collabs", "collaborations", "previous brands", "past brands", "brand collaborations"],
      portfolioLinks:            ["portfolio", "portfolio link", "profile url", "profile link", "portfolio_links"],
      contentSamples:            ["content", "samples", "content samples", "drive link", "content_samples"],
    }
  },
  vendors: {
    label: "Vendors",
    apiPath: "/vendors/bulk",
    requiredField: "vendorName",
    fields: [
      { key: "vendorName",    label: "Vendor Name",    required: true  },
      { key: "serviceType",   label: "Service Type",   required: false },
      { key: "contactPerson", label: "Contact Person", required: false },
      { key: "phone",         label: "Phone Number",   required: false },
      { key: "email",         label: "Email",          required: false },
      { key: "gstNumber",     label: "GST Number",     required: false },
      { key: "address",       label: "Address",        required: false },
      { key: "paymentTerms",  label: "Payment Terms",  required: false },
    ],
    numericFields: new Set([]),
    aliases: {
      vendorName:    ["vendor name", "vendor", "name", "company", "vendor_name"],
      serviceType:   ["service type", "category", "type", "service", "service_type"],
      contactPerson: ["contact person", "contact", "name", "person", "contact_person"],
      phone:         ["phone", "mobile", "number", "contact number", "phone number"],
      email:         ["email", "email id", "mail"],
      gstNumber:     ["gst", "gst number", "gstin", "gst_number"],
      address:       ["address", "location"],
      paymentTerms:  ["payment terms", "payment", "terms", "payment_terms"],
    }
  },
  events: {
    label: "Events",
    apiPath: "/events/bulk",
    requiredField: "eventName",
    fields: [
      { key: "eventName",   label: "Event Name",   required: true  },
      { key: "eventDate",   label: "Event Date",   required: false },
      { key: "location",    label: "Location",     required: false },
      { key: "budget",      label: "Budget (₹)",   required: false },
      { key: "status",      label: "Status",       required: false },
      { key: "description", label: "Description",  required: false },
    ],
    numericFields: new Set(["budget"]),
    aliases: {
      eventName:   ["event name", "event", "name", "event_name"],
      eventDate:   ["event date", "date", "event_date"],
      location:    ["location", "venue", "city"],
      budget:      ["budget", "cost", "value"],
      status:      ["status", "state"],
      description: ["description", "info", "details"],
    }
  },
  campaigns: {
    label: "Campaigns",
    apiPath: "/campaigns/bulk",
    requiredField: "campaignName",
    fields: [
      { key: "campaignName", label: "Campaign Name", required: true  },
      { key: "clientId",     label: "Client ID",     required: false },
      { key: "campaignType", label: "Campaign Type", required: false },
      { key: "startDate",    label: "Start Date",    required: false },
      { key: "endDate",      label: "End Date",      required: false },
      { key: "budget",       label: "Budget (₹)",    required: false },
      { key: "status",       label: "Status",        required: false },
    ],
    numericFields: new Set(["clientId", "budget"]),
    aliases: {
      campaignName: ["campaign name", "campaign", "name", "campaign_name"],
      clientId:     ["client id", "client", "client_id", "brand id", "brand_id"],
      campaignType: ["campaign type", "type", "campaign_type"],
      startDate:    ["start date", "start", "start_date"],
      endDate:      ["end date", "end", "end_date"],
      budget:       ["budget", "cost"],
      status:       ["status"],
    }
  },
  clients: {
    label: "Clients",
    apiPath: "/clients/bulk",
    requiredField: "brandName",
    fields: [
      { key: "brandName",      label: "Brand Name",      required: true  },
      { key: "contactPerson",  label: "Contact Person",  required: false },
      { key: "designation",    label: "Designation",     required: false },
      { key: "email",          label: "Email",           required: false },
      { key: "phone",          label: "Phone Number",    required: false },
      { key: "industry",       label: "Industry",        required: false },
      { key: "gstNumber",      label: "GST Number",      required: false },
      { key: "billingAddress", label: "Billing Address", required: false },
      { key: "accountManager", label: "Account Manager", required: false },
    ],
    numericFields: new Set([]),
    aliases: {
      brandName:      ["brand name", "brand", "client name", "client", "brand_name"],
      contactPerson:  ["contact person", "contact", "name", "contact_person"],
      designation:    ["designation", "role", "title"],
      email:          ["email", "email id", "mail"],
      phone:          ["phone", "mobile", "number"],
      industry:       ["industry", "sector"],
      gstNumber:      ["gst", "gst number", "gstin", "gst_number"],
      billingAddress: ["billing address", "address", "billing_address"],
      accountManager: ["account manager", "manager", "account_manager"],
    }
  },
  leads: {
    label: "Leads",
    apiPath: "/leads/bulk",
    requiredField: "leadName",
    fields: [
      { key: "leadName",       label: "Lead Name",       required: true  },
      { key: "brandName",      label: "Brand Name",      required: false },
      { key: "email",          label: "Email",           required: false },
      { key: "phone",          label: "Phone Number",    required: false },
      { key: "source",         label: "Lead Source",     required: false },
      { key: "status",         label: "Status",          required: false },
      { key: "estimatedValue", label: "Est. Value (₹)",  required: false },
    ],
    numericFields: new Set(["estimatedValue"]),
    aliases: {
      leadName:       ["lead name", "lead", "name", "contact name", "lead_name"],
      brandName:      ["brand name", "brand", "company", "brand_name"],
      email:          ["email", "email id", "mail"],
      phone:          ["phone", "mobile", "number"],
      source:         ["source", "lead source"],
      status:         ["status"],
      estimatedValue: ["estimated value", "value", "deal size", "budget", "estimated_value"],
    }
  },
  tasks: {
    label: "Tasks",
    apiPath: "/tasks/bulk",
    requiredField: "title",
    fields: [
      { key: "title",          label: "Task Title",      required: true  },
      { key: "description",    label: "Description",     required: false },
      { key: "priority",       label: "Priority",        required: false },
      { key: "status",         label: "Status",          required: false },
      { key: "dueDate",        label: "Due Date",        required: false },
      { key: "assignedToId",   label: "Assignee ID",     required: false },
      { key: "assignedToName", label: "Assignee Name",   required: false },
      { key: "linkedType",     label: "Linked Type",     required: false },
      { key: "linkedId",       label: "Linked ID",       required: false },
    ],
    numericFields: new Set(["assignedToId", "linkedId"]),
    aliases: {
      title:          ["title", "task", "name", "task name"],
      description:    ["description", "desc", "details"],
      priority:       ["priority"],
      status:         ["status"],
      dueDate:        ["due date", "due", "due_date"],
      assignedToId:   ["assigned to id", "assigned_to_id", "user id", "assignee id"],
      assignedToName: ["assigned to name", "assigned_to_name", "assignee name", "assigned to", "assignee"],
      linkedType:     ["linked type", "linked_type", "type"],
      linkedId:       ["linked id", "linked_id", "id"],
    }
  }
};

// Robust RFC-4180 CSV parser
function parseCSV(text) {
  const rows = [];
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let row = [], cur = "", inQ = false, i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"') {
      if (inQ && src[i + 1] === '"') { cur += '"'; i += 2; continue; }
      inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      row.push(cur.trim()); cur = "";
    } else if (ch === '\n' && !inQ) {
      row.push(cur.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cur = "";
    } else {
      cur += ch;
    }
    i++;
  }
  if (cur || row.length) { row.push(cur.trim()); if (row.some(Boolean)) rows.push(row); }
  return rows;
}

// Try to auto-guess mapping based on common column name patterns
function autoGuess(csvHeaders, aliases) {
  const mapping = {};
  csvHeaders.forEach((h) => {
    const lower = h.toLowerCase().trim();
    for (const [appKey, patterns] of Object.entries(aliases)) {
      if (patterns.includes(lower) && !mapping[appKey]) {
        mapping[appKey] = h;
        break;
      }
    }
  });
  return mapping;
}

const STEPS = { UPLOAD: "upload", MAP: "map", RESULT: "result" };

export default function CSVImportModal({ onClose, onSuccess, moduleType = "influencers" }) {
  const config = MODULE_CONFIGS[moduleType] || MODULE_CONFIGS.influencers;
  const fileRef = useRef(null);
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [preview, setPreview] = useState([]);   // first 3 data rows
  const [mapping, setMapping] = useState({});   // appField -> csvColumn
  const [fileName, setFileName] = useState("");
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function handleFileDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a .csv file.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = parseCSV(evt.target.result);
      if (rows.length < 2) { alert("CSV must have a header row and at least one data row."); return; }
      const headers = rows[0];
      const dataRows = rows.slice(1);
      setCsvHeaders(headers);
      setAllRows(dataRows);
      setPreview(dataRows.slice(0, 3));
      setMapping(autoGuess(headers, config.aliases));
      setStep(STEPS.MAP);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleImport() {
    setLoading(true);
    try {
      const records = allRows.map((values) => {
        const obj = {};
        config.fields.forEach(({ key }) => {
          const csvCol = mapping[key];
          if (!csvCol) return;
          const colIdx = csvHeaders.indexOf(csvCol);
          const raw = colIdx !== -1 ? (values[colIdx] ?? "") : "";
          obj[key] = config.numericFields.has(key) ? (Number(raw) || 0) : raw;
        });
        return obj;
      }).filter(r => r[config.requiredField]); // skip rows with no required field

      const res = await api.post(config.apiPath, records);
      setResult({ inserted: res.data.inserted, errors: res.data.errors || [] });
      setStep(STEPS.RESULT);
      onSuccess();
    } catch (err) {
      alert("Import failed: " + (err?.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const hasRequired = !!mapping[config.requiredField];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 dark:border-ink-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Import {config.label} from CSV</h2>
            <p className="text-xs text-ink-400 mt-0.5">Your data, your format — map your columns to our fields</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X size={18}/></button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-ink-100 dark:border-ink-700 shrink-0">
          {[["1", "Upload CSV"], ["2", "Map Columns"], ["3", "Done"]].map(([n, label], idx) => {
            const active = (idx === 0 && step === STEPS.UPLOAD) || (idx === 1 && step === STEPS.MAP) || (idx === 2 && step === STEPS.RESULT);
            const done = (idx === 0 && step !== STEPS.UPLOAD) || (idx === 1 && step === STEPS.RESULT);
            return (
              <div key={n} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${active ? "bg-brand-600 text-white" : done ? "bg-green-500 text-white" : "bg-ink-100 dark:bg-ink-700 text-ink-400"}`}>{done ? "✓" : n}</div>
                <span className={`text-xs font-medium ${active ? "text-brand-600" : "text-ink-400"}`}>{label}</span>
                {idx < 2 && <ArrowRight size={14} className="text-ink-300 mx-1"/>}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* STEP 1 — UPLOAD */}
          {step === STEPS.UPLOAD && (
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-brand-300 dark:border-brand-700 rounded-xl p-12 text-center hover:border-brand-500 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileDrop}/>
              <Upload size={40} className="mx-auto mb-4 text-brand-400"/>
              <p className="text-lg font-semibold text-ink-800 dark:text-white mb-1">Drop your CSV file here</p>
              <p className="text-sm text-ink-400 mb-4">or click to browse</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium">
                <FileText size={15}/> Choose CSV File
              </div>
              <p className="mt-4 text-xs text-ink-400">Any format works — you'll map your columns in the next step</p>
            </div>
          )}

          {/* STEP 2 — MAP COLUMNS */}
          {step === STEPS.MAP && (
            <div>
              <div className="flex items-center gap-2 mb-4 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-sm text-brand-700 dark:text-brand-300">
                <FileText size={15}/> <span className="font-medium">{fileName}</span>
                <span className="text-ink-400">— {allRows.length} rows, {csvHeaders.length} columns</span>
                <button onClick={() => setStep(STEPS.UPLOAD)} className="ml-auto text-xs underline text-ink-400 hover:text-ink-600">Change file</button>
              </div>

              {/* Preview */}
              <div className="mb-5 overflow-x-auto rounded-lg border border-ink-100 dark:border-ink-700">
                <table className="text-xs w-full">
                  <thead className="bg-ink-50 dark:bg-ink-800">
                    <tr>{csvHeaders.map(h => <th key={h} className="px-3 py-2 text-left text-ink-500 font-medium whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((row, ri) => (
                      <tr key={ri} className="border-t border-ink-100 dark:border-ink-700">
                        {csvHeaders.map((_, ci) => (
                          <td key={ci} className="px-3 py-2 text-ink-700 dark:text-ink-200 whitespace-nowrap max-w-[140px] truncate">{row[ci] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200 mb-3">
                Map your columns → <span className="text-brand-600">{mappedCount} of {config.fields.length} fields mapped</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {config.fields.map(({ key, label, required }) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${mapping[key] ? "bg-green-500" : required ? "bg-red-400" : "bg-ink-200"}`}/>
                    <label className="text-xs font-medium text-ink-700 dark:text-ink-200 w-44 shrink-0">
                      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <select
                      className="input text-xs flex-1 py-1"
                      value={mapping[key] || ""}
                      onChange={(e) => setMapping({ ...mapping, [key]: e.target.value || undefined })}
                    >
                      <option value="">— skip —</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {!hasRequired && (
                <p className="mt-4 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={13}/> Please map the "{config.fields.find(f => f.key === config.requiredField)?.label}" field — it is required.
                </p>
              )}
            </div>
          )}

          {/* STEP 3 — RESULT */}
          {step === STEPS.RESULT && result && (
            <div className="text-center py-8">
              <CheckCircle size={56} className="mx-auto mb-4 text-green-500"/>
              <h3 className="text-2xl font-bold text-ink-900 dark:text-white mb-2">Import Complete!</h3>
              <p className="text-ink-500 mb-6">{result.inserted} records added to your database successfully.</p>
              {result.errors.length > 0 && (
                <div className="text-left bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">{result.errors.length} rows were skipped:</p>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-amber-600 dark:text-amber-300">Row {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === STEPS.MAP && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-ink-100 dark:border-ink-700 shrink-0">
            <p className="text-xs text-ink-400">{allRows.length} rows will be imported · existing data is untouched</p>
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!hasRequired || loading}
                onClick={handleImport}
              >
                {loading ? "Importing..." : `Import ${allRows.length} Records`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
