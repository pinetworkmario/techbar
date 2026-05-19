export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="text-sm font-semibold text-slate-900">PI Network</div>
          <div className="mt-2 text-sm text-slate-500">
            ICT services for multi-site Australian businesses.
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Services
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Network &amp; Internet</li>
            <li>Voice / SIP</li>
            <li>POS &amp; Payments</li>
            <li>CCTV &amp; Alarm</li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Solutions
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Endpoint Support</li>
            <li>IT Support</li>
            <li>Microsoft Licensing</li>
            <li>Projects &amp; Installations</li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Company
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>About</li>
            <li>Contact</li>
            <li>Customer Portal</li>
            <li>Referral Program</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 lg:px-8">
        © {new Date().getFullYear()} PI Network Pty Ltd. All rights reserved.
      </div>
    </footer>
  );
}
