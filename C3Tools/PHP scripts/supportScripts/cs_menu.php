<?php
$domain = "c3ipt.net";
$ip = gethostbyname($domain);
$primaryPortal = ($ip === '128.136.82.102') ? 'Nickel' : 'Yaprai';
$srvPath = ($primaryPortal === 'Nickel') ? 'https://10.180.10.106' : 'https://10.170.10.215';
$logoSrc = "$srvPath/cs/CURBSTONE_dark-logo.webp";
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Curbstone Support Menu</title>
  <style>
    body{
      font-family: "Segoe UI", Arial, sans-serif;
      background:#f4f7fb;
      margin:0;
      padding:32px 18px;
      color:#1f2a37;
    }

    .container{
      max-width:1100px;   /* keeps content from drifting too far right */
      margin:0 auto;
    }

    .header{
      background:#ffffff;
      border:1px solid #cfd8e3;
      border-radius:14px;
      padding:18px 18px 10px;
      box-shadow:0 2px 8px rgba(0,0,0,0.05);
      margin-bottom:18px;
    }

    .logo{
      display:block;
      margin:0 auto 8px;
      max-width:420px;
      width: 100%;
      height:auto;
    }

    h1{
      margin:10px 0 6px;
      text-align:center;
      font-size:1.8rem;
      color:#16355d;
    }

    .portal-pill{
      display:flex;
      justify-content:center;
      margin:10px 0 6px;
    }

    .pill{
      display:inline-flex;
      align-items:center;
      gap:10px;
      padding:10px 14px;
      background:#eef5ff;
      border:1px solid #cfe0ff;
      border-left:5px solid #2f6fed;
      border-radius:12px;
      color:#16355d;
      font-weight:600;
    }

    .pill .tag{
      display:inline-block;
      padding:4px 10px;
      border-radius:999px;
      background:#2f6fed;
      color:#fff;
      font-size:0.85rem;
      font-weight:700;
      letter-spacing:0.2px;
    }

    .grid{
      display:grid;
      grid-template-columns: 1fr;
      gap:16px;
    }

    @media (min-width: 900px){
      .grid{
        grid-template-columns: 1fr 1fr; /* two columns on wider screens */
      }
    }

    .section{
      background:#ffffff;
      border:1px solid #cfd8e3;
      border-radius:14px;
      padding:16px;
      box-shadow:0 2px 8px rgba(0,0,0,0.04);
    }

    .section h2{
      margin:0 0 6px;
      font-size:1.15rem;
      color:#16355d;
    }

    .section p{
      margin:0 0 14px;
      color:#4b5f7a;
      font-size:0.95rem;
      line-height:1.35;
    }

    .links{
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .btn{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      padding:12px 14px;
      border-radius:12px;
      text-decoration:none;
      border:1px solid #cfe0ff;
      background:#f7fbff;
      color:#16355d;
      font-weight:650;
      transition: transform .06s ease, background-color .15s ease, border-color .15s ease;
    }

    .btn:hover{
      background:#eef5ff;
      border-color:#9fc0ff;
      transform: translateY(-1px);
    }

    .btn .sub{
      font-weight:500;
      color:#4b5f7a;
      font-size:0.9rem;
    }

    .btn .arrow{
      font-size:1.1rem;
      color:#2f6fed;
      font-weight:900;
    }

    /* Primary section buttons can be slightly more prominent */
    .btn.primary{
      background:#2f6fed;
      border-color:#2f6fed;
      color:#ffffff;
    }
    .btn.primary .sub{ color: rgba(255,255,255,0.9); }
    .btn.primary .arrow{ color:#ffffff; }
    .btn.primary:hover{
      background:#244fbd;
      border-color:#244fbd;
    }

    .footer-note{
      margin-top:14px;
      text-align:center;
      color:#6b7c93;
      font-size:0.9rem;
    }
  </style>
</head>

<body>
  <div class="container">

    <div class="header">
      <img class="logo" src="<?php echo $logoSrc; ?>" alt="Curbstone Logo">

      <h1>Support Menu</h1>

      <div class="portal-pill">
        <div class="pill">
          Primary Portal:
          <span class="tag"><?php echo htmlspecialchars($primaryPortal, ENT_QUOTES, 'UTF-8'); ?></span>
        </div>
      </div>
    </div>

    <div class="grid">

      <!-- Core tools -->
      <div class="section">
        <h2>Core Operations</h2>
        <p>Most-used support actions for the primary portal.</p>
        <div class="links">
          <a class="btn" href="<?php echo $srvPath; ?>/cs/dsptxn.php" target="_blank" rel="noopener noreferrer">
            <span>
              Display Transaction<br>
              <span class="sub">View transaction details by MFUKEY</span>
            </span>
            <span class="arrow">↗</span>
          </a>

          <a class="btn" href="<?php echo $srvPath; ?>/cs/merchant_config.php" target="_blank" rel="noopener noreferrer">
            <span>
              Merchant Config<br>
              <span class="sub">Lookup / view merchant config values</span>
            </span>
            <span class="arrow">↗</span>
          </a>

          <a class="btn" href="<?php echo $srvPath; ?>/cs/heartbeat.php" target="_blank" rel="noopener noreferrer">
            <span>
              Check Customer Heartbeat<br>
              <span class="sub">Confirm C3 client HB to portal</span>
            </span>
            <span class="arrow">↗</span>
          </a>

          <a class="btn" href="<?php echo $srvPath; ?>/cs/customer_lookup.php" target="_blank" rel="noopener noreferrer">
            <span>
              Customer Lookup by Name<br>
              <span class="sub">Lookup / view merchant details</span>
            </span>
            <span class="arrow">↗</span>
          </a>
        </div>
      </div>

      <!-- Settlements -->
      <div class="section">
        <h2>Settlement Related</h2>
        <p>Settlement lookups, failures, Level 3.</p>
        <div class="links">
          <a class="btn" href="<?php echo $srvPath; ?>/cs/lus4.php" target="_blank" rel="noopener noreferrer">
            <span>
              Lookup Settlement<br>
              <span class="sub">Find settlement batches and details</span>
            </span>
            <span class="arrow">↗</span>
          </a>

          <a class="btn" href="<?php echo $srvPath; ?>/cs/failed_settlements.php" target="_blank" rel="noopener noreferrer">
            <span>
              Failed Portal Settlements<br>
              <span class="sub">Identify and troubleshoot settlement failures</span>
            </span>
            <span class="arrow">↗</span>
          </a>

          <a class="btn" href="<?php echo $srvPath; ?>/cs/dsplev3.php" target="_blank" rel="noopener noreferrer">
            <span>
              Display Level 3 Data<br>
              <span class="sub">View Level 3 Data by Settlement or MFUKEY</span>
            </span>
            <span class="arrow">↗</span>
          </a>

        </div>
      </div>

      <!-- Purged transactions -->
      <div class="section">
        <h2>Purge Related</h2>
        <p>Lookup purged transactions and view Custome Purge Settings on Portal.</p>
        <div class="links">
          <a class="btn" href="https://10.170.10.215/cs/y_purtxn.php" target="_blank" rel="noopener noreferrer">
            <span>
              YAPRAI – Purged Txn Lookup<br>
              <span class="sub">Search purged transactions on Yaprai</span>
            </span>
            <span class="arrow">↗</span>
          </a>

          <a class="btn" href="https://10.180.10.106/cs/n_purtxn.php" target="_blank" rel="noopener noreferrer">
            <span>
              NICKEL – Purged Txn Lookup<br>
              <span class="sub">Search purged transactions on Nickel</span>
            </span>
            <span class="arrow">↗</span>
          </a>
		  
		  <a class="btn" href="<?php echo $srvPath; ?>/cs/purge_settings.php" target="_blank" rel="noopener noreferrer">
            <span>
              Customer Portal Purge Settings<br>
              <span class="sub">View customer purge settings for monthend purge</span>
            </span>
            <span class="arrow">↗</span>
          </a>
        </div>
      </div>

      <!-- Optional: Add a section for “Related Links” later -->
      <div class="section">
        <h2>Misc Links</h2>
        <p>Sales and other misc links.</p>
        <div class="links">
          <a class="btn" href="<?php echo $srvPath; ?>/cs/settled_transactions.php" target="_blank" rel="noopener noreferrer">
            <span>
              Settled $$ By Customer<br>
              <span class="sub">Txn Type/$$ Totals by customer & data range</span>
            </span>
            <span class="arrow">↗</span>
          </a>
        </div>
      </div>

    </div>

    <div class="footer-note">
      Links open in a new tab. Primary portal is determined by DNS for <?php echo htmlspecialchars($domain, ENT_QUOTES, 'UTF-8'); ?>.
      <p>&copy; <?php echo date('Y'); ?> Curbstone.</p>
    </div>

  </div>
</body>
</html>
