const minutesAgo = n => new Date(Date.now() - n * 60000).toISOString()
export const clinic = { id: 'care-clinic-sec62', name: 'Care Clinic - Sector 62', doctor: 'Dr. Aditi Sharma', email: 'care@medsync.local', password: 'demo123' }
export const seedPatients = [
  { id: 'A-01', clinicId: clinic.id, name: 'Rohan Mehta', age: 34, symptom: 'Fever', urgency: 'Normal', status: 'Completed', arrivedAt: minutesAgo(92), duration: 9 },
  { id: 'A-02', clinicId: clinic.id, name: 'Nisha Kapoor', age: 43, symptom: 'Migraine', urgency: 'Normal', status: 'Completed', arrivedAt: minutesAgo(74), duration: 11 },
  { id: 'A-03', clinicId: clinic.id, name: 'Aman Verma', age: 57, symptom: 'Chest discomfort', urgency: 'Urgent', status: 'In Consultation', arrivedAt: minutesAgo(48), duration: null },
  { id: 'A-04', clinicId: clinic.id, name: 'Priya Nair', age: 28, symptom: 'Cough', urgency: 'Normal', status: 'Waiting', arrivedAt: minutesAgo(34), duration: null },
  { id: 'A-05', clinicId: clinic.id, name: 'Kabir Singh', age: 6, symptom: 'Stomach pain', urgency: 'Normal', status: 'Waiting', arrivedAt: minutesAgo(19), duration: null },
  { id: 'A-06', clinicId: clinic.id, name: 'Meera Iyer', age: 39, symptom: 'Dizziness', urgency: 'Urgent', status: 'Waiting', arrivedAt: minutesAgo(8), duration: null }
]
