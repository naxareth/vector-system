'use client';

interface CertificationItem {
  name: string;
  issuer: string;
  date: string;
  verified: boolean;
}

interface AwardItem {
  title: string;
  description: string;
}

interface CertificationsSectionProps {
  certifications: CertificationItem[];
  awards: AwardItem[];
  onAddCertification: () => void;
  onAddAward: () => void;
  onRemoveCertification: (index: number) => void;
  onRemoveAward: (index: number) => void;
  onUpdateCertification: (index: number, field: string, value: string) => void;
  onUpdateAward: (index: number, field: string, value: string) => void;
}

export default function CertificationsSection({
  certifications,
  awards,
  onAddCertification,
  onAddAward,
  onRemoveCertification,
  onRemoveAward,
  onUpdateCertification,
  onUpdateAward,
}: CertificationsSectionProps) {
  return (
    <div className="pt-6 border-t border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
        Certifications & Awards
        <div className="space-x-4">
          <button
            type="button"
            onClick={onAddCertification}
            className="text-sm text-[#06B4C9] hover:text-[#06B4C9]/80 font-medium"
          >
            + Add Certification
          </button>
          <button
            type="button"
            onClick={onAddAward}
            className="text-sm text-[#06B4C9] hover:text-[#06B4C9]/80 font-medium"
          >
            + Add Award
          </button>
        </div>
      </h2>

      {certifications.map((cert, index) => (
        <div
          key={`cert-${index}`}
          className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100 relative"
        >
          <button
            type="button"
            onClick={() => onRemoveCertification(index)}
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
          >
            ×
          </button>
          <p className="text-xs text-blue-600 font-semibold mb-2 uppercase">Certification</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Certification Name"
              className="p-2 border rounded"
              value={cert.name}
              onChange={(e) => onUpdateCertification(index, 'name', e.target.value)}
            />
            <input
              placeholder="Issuing Organization"
              className="p-2 border rounded"
              value={cert.issuer}
              onChange={(e) => onUpdateCertification(index, 'issuer', e.target.value)}
            />
            <input
              placeholder="Date Earned"
              className="p-2 border rounded"
              value={cert.date}
              onChange={(e) => onUpdateCertification(index, 'date', e.target.value)}
            />
          </div>
        </div>
      ))}

      {awards.map((award, index) => (
        <div
          key={`award-${index}`}
          className="bg-yellow-50 p-4 rounded-lg mb-4 border border-yellow-100 relative"
        >
          <button
            type="button"
            onClick={() => onRemoveAward(index)}
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
          >
            ×
          </button>
          <p className="text-xs text-yellow-600 font-semibold mb-2 uppercase">Award</p>
          <div className="grid grid-cols-1 gap-4">
            <input
              placeholder="Award Title"
              className="p-2 border rounded"
              value={award.title}
              onChange={(e) => onUpdateAward(index, 'title', e.target.value)}
            />
            <textarea
              placeholder="Description"
              rows={2}
              className="p-2 border rounded"
              value={award.description}
              onChange={(e) => onUpdateAward(index, 'description', e.target.value)}
            />
          </div>
        </div>
      ))}

      {certifications.length === 0 && awards.length === 0 && (
        <p className="text-sm text-gray-500 italic">No certifications or awards added yet.</p>
      )}
    </div>
  );
}