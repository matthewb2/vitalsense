import Header from '../components/Header';

export default function LocationPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">위치정보서비스</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-4">
          <p>현재 VitalSense AI 서비스는 위치정보를 수집하지 않습니다.</p>
          <br />
          <p>향후 위치 기반 서비스를 제공할 경우, 별도의 동의를 요청할 예정입니다.</p>
        </div>
      </main>
    </div>
  );
}