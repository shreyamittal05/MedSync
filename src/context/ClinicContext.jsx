import { createContext, useContext, useEffect, useReducer } from 'react'
import { clinic as demoClinic, seedPatients } from '../data/seed'
import { activeQueue } from '../utils/queueMath'
const ClinicContext = createContext(null)
const read = (key, fallback) => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback } }
const initial = { clinics: read('medsync_clinics', [demoClinic]), patients: read('medsync_patients', seedPatients) }
function reducer(state, action) { switch (action.type) {
  case 'REGISTER': return { ...state, clinics: [...state.clinics, action.clinic] }
  case 'ADD': return { ...state, patients: [...state.patients, action.patient] }
  case 'UPDATE': return { ...state, patients: state.patients.map(p => p.id === action.id && p.clinicId === action.clinicId ? { ...p, ...action.changes } : p) }
  case 'CALL_NEXT': { const scoped = state.patients.filter(p => p.clinicId === action.clinicId); const called = scoped.find(p => p.status === 'Called'); const next = activeQueue(scoped).find(p => p.status === 'Waiting'); return { ...state, patients: state.patients.map(p => p.id === called?.id ? { ...p, status: 'Waiting' } : p.id === next?.id ? { ...p, status: 'Called' } : p) } }
  case 'SYNC': return JSON.stringify(state) === JSON.stringify(action.payload) ? state : action.payload
  default: return state
} }
export function ClinicProvider({ children }) { const [state, dispatch] = useReducer(reducer, initial); useEffect(() => { localStorage.setItem('medsync_clinics', JSON.stringify(state.clinics)); localStorage.setItem('medsync_patients', JSON.stringify(state.patients)) }, [state]); useEffect(() => { const sync = e => { if (e.key === 'medsync_clinics' || e.key === 'medsync_patients') dispatch({ type: 'SYNC', payload: { clinics: read('medsync_clinics', []), patients: read('medsync_patients', []) } }) }; window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync) }, []); return <ClinicContext.Provider value={{ ...state, dispatch, clinicFor: id => state.clinics.find(c => c.id === id) }}>{children}</ClinicContext.Provider> }
export const useClinic = () => useContext(ClinicContext)
