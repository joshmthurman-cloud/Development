<?php
declare(strict_types=1);

/**
 * customer_lookup.php
 * IBM i (Db2 for i) Customer name lookup using ibm_db2 (NO PDO)
 */

const DB_SCHEMA = 'CURBSTONE';
const DB_TABLE  = 'CCFP5010';

// get the connection credentials from the /www/phpweb/cs/cs_menu.ini file
$config = parse_ini_file('/www/phpweb/cs/cs_menu.ini', true);             
                                                                          
$dbUser = $config['config']['user'];                                    
$dbPass = $config['config']['password'];                            
$dbHost = $config['config']['dbname'];                               

// text box data
$infoBoxText = "Data retrieved from portal config files.";

$maxRows = 50;

$search = isset($_GET['customer_name']) ? trim((string)$_GET['customer_name']) : '';
$doSearch = ($search !== '');

$rows = [];
$error = null;

/**
 * Build merchant_config URL with blank merchant parameter
 */
function buildTargetUrl(string $customer): string
{
    return 'merchant_config.php?customer=' . rawurlencode($customer) . '&merchant=';
}

if ($doSearch) {
    try {
        // Connect using ibm_db2
        // Common DB name values on IBM i: '*LOCAL' or an RDB name (WRKRDBDIRE)
        $connOptions = [
            // Optional: force naming convention; usually not needed if you qualify schema.table
            // 'i5_naming' => DB2_I5_NAMING_ON,
        ];

        $conn = db2_connect($dbHost, $dbUser, $dbPass);
        if (!$conn) {
            throw new RuntimeException('DB connection failed: ' . db2_conn_errormsg());
        }

        // LIKE match (case-sensitive depending on CCSID/collation).
        // For case-insensitive, see commented SQL below.
       // $sql = "SELECT *
       //         FROM " . DB_SCHEMA . "." . DB_TABLE . "
       //         WHERE CSCNAM LIKE ?
       //         ORDER BY CSCNAM
       //         FETCH FIRST {$maxRows} ROWS ONLY";

        // Case-insensitive alternative:
         $sql = "SELECT *
                 FROM " . DB_SCHEMA . "." . DB_TABLE . "
                 WHERE UPPER(CSCNAM) LIKE UPPER(?)
                 ORDER BY CSCNAM
                 FETCH FIRST {$maxRows} ROWS ONLY";

        $stmt = db2_prepare($conn, $sql);
        if (!$stmt) {
            throw new RuntimeException('Prepare failed: ' . db2_stmt_errormsg());
        }

        $pattern = '%' . $search . '%';
        $params = [$pattern];

        if (!db2_execute($stmt, $params)) {
            throw new RuntimeException('Execute failed: ' . db2_stmt_errormsg($stmt));
        }

        while ($row = db2_fetch_assoc($stmt)) {
            // Normalize to strings for display/URL usage
            $rows[] = [
                'CSCUST' => isset($row['CSCUST']) ? (string)$row['CSCUST'] : '',
                'CSCNAM' => isset($row['CSCNAM']) ? (string)$row['CSCNAM'] : '',
				'CSCAD1' => isset($row['CSCAD1']) ? (string)$row['CSCAD1'] : '',
				'CSCAD2' => isset($row['CSCAD2']) ? (string)$row['CSCAD2'] : '',
				'CSCITY' => isset($row['CSCITY']) ? (string)$row['CSCITY'] : '',
				'CSSTAT' => isset($row['CSSTAT']) ? (string)$row['CSSTAT'] : '',
				'CSCZIP' => isset($row['CSCZIP']) ? (string)$row['CSCZIP'] : '',
				'CSCNTC' => isset($row['CSCNTC']) ? (string)$row['CSCNTC'] : '',
				'CSPHON' => isset($row['CSPHON']) ? (string)$row['CSPHON'] : '',
            ];
        }

        db2_free_stmt($stmt);
        db2_close($conn);
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

$self = htmlspecialchars($_SERVER['PHP_SELF'], ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Merchant Lookup</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
    font-family: Arial, sans-serif;
    margin: 20px;
    background-color: #f4f7fb;
}

.card {
    background-color: #ffffff;
    border: 1px solid #cfd8e3;
    border-radius: 10px;
    padding: 18px;
    max-width: 100%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

h2 {
    margin-top: 0;
    color: #1f3a5f;
}

.row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
}

label {
    font-weight: 600;
    color: #1f3a5f;
}

input[type="text"] {
    padding: 9px 10px;
    width: 360px;
    max-width: 100%;
    border-radius: 6px;
    border: 1px solid #b6c4d6;
}

input[type="text"]:focus {
    outline: none;
    border-color: #2f6fed;
    box-shadow: 0 0 0 2px rgba(47,111,237,0.15);
}

button,
a.btn {
    padding: 9px 16px;
    border-radius: 6px;
    border: 1px solid #2f6fed;
    background-color: #2f6fed;
    color: #ffffff;
    cursor: pointer;
    text-decoration: none;
    font-weight: 600;
}

button:hover,
a.btn:hover {
    background-color: #244fbd;
    border-color: #244fbd;
}

a.btn {
    display: inline-block;
}

.meta {
    margin-top: 14px;
    color: #4b5f7a;
    font-size: 0.95em;
}

/* Table styling */
table {
    border-collapse: collapse;
    margin-top: 16px;
    width: 100%;
}

th {
    background-color: #eaf1fb;
    color: #1f3a5f;
    border-bottom: 2px solid #2f6fed;
    padding: 10px;
    text-align: left;
}

td {
    border-bottom: 1px solid #dde6f2;
    padding: 9px 10px;
}

tr:nth-child(even) td {
    background-color: #f8fbff;
}

/* Link styling for CSCUST */
td a {
    color: #2f6fed;
    font-weight: 600;
    text-decoration: none;
}

td a:hover {
    text-decoration: underline;
}

/* Error message */
.error {
    margin-top: 12px;
    padding: 10px;
    background-color: #fdeaea;
    border: 1px solid #f5c2c2;
    color: #8a1f1f;
    border-radius: 6px;
}
 .form-wrapper {
   display: flex;
   gap: 20px;
   align-items: flex-start;
   max-width: 1100px;   /* keeps both sections from spreading too far */
 }
 .form-left {
   flex: 0 0 auto;
 }
 .info-box {
   flex: 0 0 auto;        /* grows a bit but stays near the form */
   max-width: 500px;       /* prevents it from drifting right */
   padding:  5px  5px;
   background-color: #eef5ff;
   border: 1px solid #cfe0ff;
   border-left: 5px solid #2f6fed;
   color: #1f3a5f;
   border-radius:10px;
   font-size: 0.95em;
   line-height: 1.3em;
 }
 .hint {
     margin-top: 8px;
     margin-bottom: 6px;
     padding: 8px 10px;
     background-color: #eef5ff;
     border-left: 4px solid #2f6fed;
     color: #1f3a5f;
     border-radius: 4px;
     font-size: 0.95em;
 }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="margin-top:0;">Customer Lookup by Name</h2>

    <form method="get" action="">
     <div class="form-wrapper">
     <div class="form-left">
      <div class="row">
        <label for="customer_name">Customer name:</label>
        <input
          id="customer_name"
          name="customer_name"
          type="text"
          value="<?= htmlspecialchars($search, ENT_QUOTES, 'UTF-8') ?>"
          placeholder="Type part of the Customer name..."
          autocomplete="off"
        >

        <button type="submit">Submit</button>
        <a class="btn" href="<?= $self ?>">Clear</a>
      </div>
      </div>

      <div class="info-box">
              <ul>
                <li>Key part of the customer name - (case insensitive)</li>
                <li>Data is retrieved from portal configs</li>
              </ul>
          </div>
        </div>
    </form>

    <?php if ($error): ?>
      <div class="error"><strong>Error:</strong> <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
    <?php endif; ?>

    <?php if ($doSearch && !$error): ?>
      <div class="meta">
        Found <strong><?= count($rows) ?></strong> result(s) for
        <strong><?= htmlspecialchars($search, ENT_QUOTES, 'UTF-8') ?></strong>.
        (Showing up to <?= (int)$maxRows ?>)
      </div>
      <?php if (count($rows) > 0): ?>
          <div class="hint">
              Click the <strong>Customer#</strong> to go to the merchant configuration.
          </div>
      <?php endif; ?>



      <table aria-label="Merchant results">
        <thead>
          <tr>
            <th>Cust#</th>
            <th>Name</th>
			         <th>Address1</th>
			         <th>Address2</th>
			         <th>City</th>
			         <th>State</th>
			         <th>Zip Code</th>
			         <th>Contact</th>
			         <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          <?php if (count($rows) === 0): ?>
            <tr><td colspan="2">No matches.</td></tr>
          <?php else: ?>
            <?php foreach ($rows as $r): ?>
              <?php
                $cust = $r['CSCUST'];
                $name = $r['CSCNAM'];
                $add1 = $r['CSCAD1'];
                $add2 = $r['CSCAD2'];
                $city = $r['CSCITY'];
                $stat = $r['CSSTAT'];
                $zip  = $r['CSCZIP'];
                $cntc = $r['CSCNTC'];
                $phon = $r['CSPHON'];
                $url  = buildTargetUrl($cust);
              ?>
             <tr>
              <td>
                <a href="<?= htmlspecialchars($url, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener roreferrer">
                <?= htmlspecialchars($cust, ENT_QUOTES, 'UTF-8') ?></a>
              </td>
                <td><?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($add1, ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($add2, ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($city, ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($stat, ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($zip, ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($cntc, ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($phon, ENT_QUOTES, 'UTF-8') ?></td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </div>
</body>
</html>
