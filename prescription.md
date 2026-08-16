<!--
  prescription_sample.md
  ----------------------
  Faithful Markdown + embedded HTML/CSS reproduction of the uploaded sample
  prescription (Final_Sample.png) for "Futuristic Physio & Wellness Hub".
  This is the visual + structural reference the backend prescription PDF
  template (backend/app/templates/prescription.html, WeasyPrint) should be
  built from — same field labels, same table columns, same color palette,
  same layout order. Colors below were sampled directly from the source
  image.

  Palette reference:
    --navy-border : #14225c   (outer card border)
    --navy-title  : #0a2c66   (clinic name)
    --blue-accent : #0c4dbc   (doctor name)
    --navy-text   : #001b59   (credential lines / icon circles)
    --wave-blue   : #447dfd   (footer wave, upper layer)
    --wave-navy   : #0a2358   (footer wave, lower/darker layer)
    --ink         : #1a1a1a   (body text / field values)
-->

# Prescription Sample — Futuristic Physio & Wellness Hub

<div class="rx-card">

  <div class="rx-header">
    <h1 class="rx-clinic-name">Futuristic Physio &amp; Wellness Hub</h1>
    <h2 class="rx-doctor-name">DR. SWANDHA MAJUMDAR (PT)</h2>
    <p class="rx-credentials">
      BPTH (KEM), MPTH (MSK), MANUAL &amp; MOVEMENT THERAPIST<br>
      ADVANCED REHABILITATION SPECIALIST<br>
      REG NO. 2010/05/PT/000486
    </p>
  </div>

  <hr class="rx-hr">

  <div class="rx-meta">
    <div class="rx-meta-row">
      <div class="rx-field rx-field-wide">
        <span class="rx-label">Name:</span>
        <span class="rx-value rx-underline">Mr. Sushanth</span>
      </div>
      <div class="rx-field">
        <span class="rx-label">Date:</span>
        <span class="rx-value rx-underline">20-01-2025 10:50 am</span>
      </div>
    </div>
    <div class="rx-meta-row">
      <div class="rx-field rx-field-wide">
        <span class="rx-label">Age/Sex:</span>
        <span class="rx-value rx-underline">37y / M</span>
      </div>
      <div class="rx-field">
        <span class="rx-label">Mobile:</span>
        <span class="rx-value rx-underline">9663501146</span>
      </div>
    </div>
    <div class="rx-meta-row">
      <div class="rx-field rx-field-wide">
        <span class="rx-label">Office ID:</span>
        <span class="rx-value rx-underline">MP1449</span>
      </div>
      <div class="rx-field"></div>
    </div>
  </div>

  <div class="rx-notes">
    <p><span class="rx-label">Symptoms:</span> no history of drug allergy, cough under evaluation, recent history of cold</p>
    <p><span class="rx-label">Findings:</span> Congestion of throat, congestion of nasal mucosa</p>
    <p><span class="rx-label">Notes:</span> Af</p>
    <p><span class="rx-label">Vitals:</span> Pulse: 76 /min, SPO2: 96 %, BP: 120/75 mmHg</p>
    <p><span class="rx-label">Diagnosis:</span> LRTI Lower respiratory tract infection, Chronic sinusitis, Acute Pharyngitis</p>
  </div>

  <table class="rx-table">
    <thead>
      <tr>
        <th class="rx-col-rx">Rx</th>
        <th class="rx-col-name">Name</th>
        <th class="rx-col-freq">Frequency</th>
        <th class="rx-col-dur">Duration</th>
        <th class="rx-col-notes">Notes</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td><strong>Tablet Cepodem XP (325 mg)</strong><br><span class="rx-generic">Cefpodoxime(200 mg) + Clavulanic Acid(125 mg)</span></td>
        <td>1 units - Twice a day</td>
        <td>3 Days</td>
        <td>After Food</td>
      </tr>
      <tr>
        <td>2</td>
        <td><strong>Tablet Pantocid (40 mg)</strong><br><span class="rx-generic">Pantoprazole(40 mg)</span></td>
        <td>1 units - Once a day</td>
        <td>SOS</td>
        <td>Before Food</td>
      </tr>
      <tr>
        <td>3</td>
        <td><strong>Tablet Pulmoclear</strong><br><span class="rx-generic">Acebrophylline(100 mg) + Acetyl Cysteine(600 mg)</span></td>
        <td>1 units - Twice a day</td>
        <td>5 Days</td>
        <td>After Food</td>
      </tr>
      <tr>
        <td>4</td>
        <td><strong>Syrup Reswas (120 ml)</strong><br><span class="rx-generic">Chlorpheniramine Maleate(2 mg) + Levodropropizine(30 mg)</span></td>
        <td>10 ml - Thrice a day</td>
        <td>3 Days</td>
        <td>cough</td>
      </tr>
      <tr>
        <td>5</td>
        <td><strong>Tablet Mondeslor</strong><br><span class="rx-generic">Desloratadine(5 mg) + Montelukast(10 mg)</span></td>
        <td>1 units - Once a day</td>
        <td>5 Days</td>
        <td>Bedtime</td>
      </tr>
    </tbody>
  </table>

  <div class="rx-instructions">
    <span class="rx-label">Instructions:</span>
    <ul>
      <li>salt water garggling</li>
      <li>Review after 5 days</li>
    </ul>
  </div>

  <div class="rx-footer">
    <div class="rx-contact">
      <div class="rx-contact-row">
        <span class="rx-icon">&#9742;</span>
        <span><strong>Phone</strong><br>8369085685</span>
      </div>
      <div class="rx-contact-row">
        <span class="rx-icon">&#9993;</span>
        <span><strong>Email</strong><br>futuristicphysiohub@gmail.com</span>
      </div>
      <div class="rx-contact-row">
        <span class="rx-icon">&#9825;</span>
        <span><strong>Instagram</strong><br>Futuristic Physio</span>
      </div>
    </div>
    <div class="rx-signature">
      <div class="rx-sig-line"></div>
      <p>Signature</p>
    </div>
  </div>

  <div class="rx-wave">
    <svg viewBox="0 0 1056 160" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,90 C180,40 340,140 560,90 C760,50 900,110 1056,70 L1056,160 L0,160 Z" fill="#447dfd"/>
      <path d="M0,130 C220,100 420,155 660,120 C840,95 950,140 1056,115 L1056,160 L0,160 Z" fill="#0a2358"/>
    </svg>
  </div>

</div>

<style>
  .rx-card {
    max-width: 780px;
    margin: 0 auto;
    background: #ffffff;
    border: 3px solid #14225c;
    border-radius: 18px;
    padding: 36px 44px 0 44px;
    font-family: "Poppins", "Segoe UI", Arial, sans-serif;
    color: #1a1a1a;
    overflow: hidden;
    position: relative;
  }
  .rx-header { text-align: center; }
  .rx-clinic-name {
    color: #0a2c66;
    font-size: 30px;
    font-weight: 800;
    margin: 0 0 6px 0;
    letter-spacing: 0.3px;
  }
  .rx-doctor-name {
    color: #0c4dbc;
    font-size: 19px;
    font-weight: 800;
    margin: 0 0 8px 0;
    letter-spacing: 0.5px;
  }
  .rx-credentials {
    color: #001b59;
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.5;
    margin: 0 0 14px 0;
  }
  .rx-hr {
    border: none;
    border-top: 2px solid #2f5bea;
    margin: 0 0 22px 0;
  }
  .rx-meta { margin-bottom: 18px; }
  .rx-meta-row {
    display: flex;
    gap: 32px;
    margin-bottom: 14px;
  }
  .rx-field { flex: 1; font-size: 15px; }
  .rx-field-wide { flex: 1.4; }
  .rx-label {
    font-weight: 800;
    color: #0a2c66;
    margin-right: 6px;
  }
  .rx-underline {
    display: inline-block;
    border-bottom: 1.5px solid #6a8fe6;
    padding-bottom: 2px;
    min-width: 160px;
  }
  .rx-notes p {
    font-size: 14.5px;
    margin: 0 0 10px 0;
    line-height: 1.4;
  }
  .rx-notes .rx-label { min-width: 110px; display: inline-block; }
  .rx-table {
    width: 100%;
    border-collapse: collapse;
    margin: 22px 0 18px 0;
    font-size: 13.5px;
  }
  .rx-table th, .rx-table td {
    border: 1.5px solid #14225c;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  .rx-table th {
    background: #eef2fc;
    color: #0a2c66;
    font-weight: 800;
  }
  .rx-col-rx { width: 6%; text-align: center; }
  .rx-generic {
    font-variant: small-caps;
    font-style: italic;
    color: #333;
    font-size: 12px;
  }
  .rx-instructions { font-size: 14px; margin-bottom: 26px; }
  .rx-instructions ul { margin: 6px 0 0 0; padding-left: 22px; }
  .rx-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 130px;
  }
  .rx-contact-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 13.5px;
  }
  .rx-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #0a2c66;
    color: #ffffff;
    font-size: 14px;
  }
  .rx-signature { text-align: center; }
  .rx-sig-line {
    width: 200px;
    border-top: 1.5px solid #333;
    margin-bottom: 6px;
  }
  .rx-signature p {
    font-weight: 800;
    color: #0a2c66;
    margin: 0;
  }
  .rx-wave {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    line-height: 0;
  }
  .rx-wave svg { width: 100%; height: 150px; display: block; }
</style>
