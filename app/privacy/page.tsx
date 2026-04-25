import Header from '../components/Header';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">개인정보처리방침</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-4">
          <p className="text-lg font-semibold">1. 수집하는 개인정보</p>
          <p>우리는 서비스 이용을 위해 다음과 같은 개인정보를 수집합니다:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>이메일 (Google 소셜 로그인)</li>
            <li>이름 (Google 소셜 로그인)</li>
            <li>프로필 이미지 (Google 소셜 로그인)</li>
            <li>혈압, 혈당, 체중 기록 데이터</li>
          </ul>
          <br />
          <p className="text-lg font-semibold">2. 개인정보의 이용 목적</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>서비스 제공 및 개인화</li>
            <li>건강 데이터記録 및 분석</li>
            <li>사용자 인증</li>
          </ul>
          <br />
          <p className="text-lg font-semibold">3. 개인정보 보호</p>
          <p>회원의 개인정보는 안전하게 보호되며, 제3자에게 제공되지 않습니다.</p>
        </div>
      </main>
    </div>
  );
}