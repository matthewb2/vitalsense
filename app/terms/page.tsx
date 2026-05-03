import Header from '../components/Header';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">이용약관</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-4">
          <p>제1조 (목적)</p>
          <p>이 약관은 바이탈센스 AI 서비스의 이용조건을 제공합니다.</p>
          <br />
          <p>제2조 (서비스 이용)</p>
          <p>회원은 본 서비스에서 제공하는 혈압, 혈당, 체중 기록 등의 기능을 이용할 수 있습니다.</p>
          <br />
          <p>제3조 (개인정보)</p>
          <p>회원의 개인정보는 개인정보처리방침에 따라 보호됩니다.</p>
          <br />
          <p>제4조 (책임사항)</p>
          <p>회원은 본인의 계정 정보를 관리할 책임이 있습니다.</p>
        </div>
      </main>
    </div>
  );
}