import { useState } from "react";
import {
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  MapPin,
  Mic,
  MicOff,
  Sparkles,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useDemo } from "../demo-context";
import { DEMO_SAMPLE_IMAGES } from "../demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoCitizenReportPage() {
  const { createIssue, currentPersona } = useDemo();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Roads & Infrastructure");
  const [locationText, setLocationText] = useState("Morabadi Ground, Ranchi");
  const [districtName, setDistrictName] = useState("Ranchi");
  const [selectedImageKey, setSelectedImageKey] = useState<keyof typeof DEMO_SAMPLE_IMAGES>("pothole_reported");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSimulated, setVoiceSimulated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulated Voice Input
  const handleToggleVoice = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setVoiceSimulated(true);
        setTitle("Damaged Stormwater Drain Rupturing Pedestrian Pavement");
        setDescription(
          "Large crack on concrete drain cover causing sewage water overflow onto main walking pavement. Two elders have tripped this morning."
        );
        setCategory("Water Supply & Sewerage");
        setLocationText("Harmu Housing Colony, Ward 26");
        setSelectedImageKey("drainage_blocked");
      }, 2000);
    } else {
      setIsRecording(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    const newIssueId = createIssue({
      title,
      description,
      category,
      location_text: locationText,
      district_name: districtName,
      custom_image_url: DEMO_SAMPLE_IMAGES[selectedImageKey],
    });

    setTimeout(() => {
      setIsSubmitting(false);
      void navigate(`/demo/citizen/issues/${newIssueId}`);
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        tag="Interactive Submission Wizard"
        title="Report a Civic Issue"
        description="Submit a simulated civic complaint with photo evidence, GPS location, and simulated Indic speech-to-text."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Form */}
        <form onSubmit={handleSubmit} className="md:col-span-2 space-y-5">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>1. Grievance Details</span>
                <span className="text-xs font-normal text-muted-foreground">Sandbox Mode</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Simulated Voice Recorder */}
              <div className="rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-white p-3.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5 text-teal-700" />
                    Simulated Indic Voice Input
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Click record to simulate Hindi/Marathi speech-to-text transcription.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={handleToggleVoice}
                  className={`text-xs font-bold shrink-0 ${isRecording ? "animate-pulse" : "border-teal-300 text-teal-900 bg-white"}`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="mr-1.5 h-3.5 w-3.5" />
                      Listening (Hindi)...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-1.5 h-3.5 w-3.5" />
                      Try Voice Input
                    </>
                  )}
                </Button>
              </div>

              {voiceSimulated && (
                <div className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  Voice transcribed and auto-populated from simulated Indic speech!
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Issue Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep pothole on Station Road near Auto Stand"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Category */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                    <option value="Sanitation & Waste">Sanitation & Waste</option>
                    <option value="Water Supply & Sewerage">Water Supply & Sewerage</option>
                    <option value="Electrical & Lighting">Electrical & Lighting</option>
                    <option value="Parks & Recreation">Parks & Recreation</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">District *</label>
                  <input
                    type="text"
                    value={districtName}
                    onChange={(e) => setDistrictName(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Location / Landmark *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Near Firayalal Chowk, Main Road"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide details on the issue severity, duration, and hazards..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Sample Photo Selector */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-teal-700" />
                    Attach Simulated Photo Evidence
                  </span>
                  <span className="text-[11px] font-normal text-muted-foreground">Select a sample photo</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: "pothole_reported", label: "Pothole Hazard" },
                      { key: "drainage_blocked", label: "Blocked Drain" },
                      { key: "streetlight_broken", label: "Dark Street" },
                      { key: "garbage_overflow", label: "Garbage Pile" },
                      { key: "water_leak", label: "Water Pipe Burst" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedImageKey(item.key)}
                      className={`relative rounded-lg overflow-hidden border-2 text-left p-1 transition ${
                        selectedImageKey === item.key
                          ? "border-teal-600 ring-2 ring-teal-500/30"
                          : "border-border/60 hover:border-teal-300"
                      }`}
                    >
                      <img
                        src={DEMO_SAMPLE_IMAGES[item.key]}
                        alt={item.label}
                        className="h-16 w-full object-cover rounded"
                      />
                      <p className="mt-1 text-[10px] font-semibold text-foreground truncate text-center">
                        {item.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold h-11 shadow-sm"
          >
            {isSubmitting ? "Simulating AI Triage..." : "Submit Grievance to Sandbox Queue"}
          </Button>
        </form>

        {/* AI Pre-Triage Preview & Information */}
        <div className="space-y-4">
          <Card className="border-teal-200/90 bg-gradient-to-br from-teal-50/50 via-white to-sky-50/50 shadow-xs">
            <CardHeader className="pb-3 border-b border-teal-100">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-teal-950">
                <Sparkles className="h-4 w-4 text-teal-600" />
                Deterministic AI Triage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                When you submit, CivicFix runs a deterministic simulated AI triage:
              </p>

              <div className="space-y-1.5 bg-white/90 p-3 rounded-lg border border-teal-100">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-bold">{category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Workflow:</span>
                  <span className="font-bold text-teal-700">SIMPLE Track</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duplicate Check:</span>
                  <span className="font-bold text-emerald-700">4-Factor Engine (Clean)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confidence:</span>
                  <span className="font-bold text-sky-700">95%</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                After submission, switch to <strong>Municipal Officer</strong> or <strong>Department Manager</strong> to process this issue!
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sandbox Reporter Persona
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-1 text-xs">
              <p className="font-bold text-foreground">{currentPersona.fullName}</p>
              <p className="text-muted-foreground">{currentPersona.email}</p>
              <p className="text-muted-foreground">{currentPersona.phone}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
