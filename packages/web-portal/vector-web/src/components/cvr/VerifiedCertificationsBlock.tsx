'use client';

interface VerifiedCert {
  id: string;
  skill_name: string;
  issued_at: string;
}

interface CertificationFormItem {
  name: string;
  issuer: string;
  date: string;
  verified: boolean;
}

interface VerifiedCertificationsBlockProps {
  availableCertifications: VerifiedCert[];
  addedCertifications: CertificationFormItem[];
  onAdd: (cert: VerifiedCert) => void;
}

export default function VerifiedCertificationsBlock({
  availableCertifications,
  addedCertifications,
  onAdd,
}: VerifiedCertificationsBlockProps) {
  if (availableCertifications.length === 0) return null;

  return (
    <div className="pt-6 border-t border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        Available Verified Certifications
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          Blockchain Synced
        </span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableCertifications.map((cert) => {
          const isAdded = addedCertifications.some(
            (c) => c.name === cert.skill_name && c.verified
          );
          return (
            <div
              key={cert.id}
              className={`p-4 rounded-lg border flex justify-between items-center ${
                isAdded
                  ? 'bg-green-50 border-green-200 opacity-70'
                  : 'bg-white border-purple-200 shadow-sm'
              }`}
            >
              <div>
                <h3 className="font-bold text-gray-800">{cert.skill_name}</h3>
                <p className="text-xs text-gray-500">
                  Issued: {new Date(cert.issued_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAdd(cert)}
                disabled={isAdded}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isAdded
                    ? 'text-green-700 bg-green-100 cursor-default'
                    : 'text-white bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isAdded ? 'Added ✓' : '+ Add to CVR'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}