<?php

// get the connection credentials from the /www/phpweb/cs/cs_menu.ini file
$config = parse_ini_file('/www/phpweb/cs/cs_menu.ini', true);

$user = $config['config']['user'];
$password = $config['config']['password'];
$database = $config['config']['dbname'];

// DB2 connection info
//$user = 'C3GUI';
//$password = 'QAZSE4RFVZ';
//$database = '*LOCAL';

$nbcust = isset($_POST['nbcust']) ? trim($_POST['nbcust']) : '';
$nbdate = isset($_POST['nbdate']) ? trim($_POST['nbdate']) : '';
$nbdate_end = isset($_POST['nbdate_end']) ? trim($_POST['nbdate_end']) : '';
$nbmrch = isset($_POST['nbmrch']) ? trim($_POST['nbmrch']) : '';

?>
<!DOCTYPE html>
<html>
<head>
    <title>Settlement Lookup by MFCUST and DATE</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f4f4f8;
            padding: 40px;
        }
        h2 {
            text-align: center;
            margin-bottom: 30px;
        }
        .form-container {
            background: #fff;
            padding: 20px 30px;
            border-radius: 8px;
            max-width: 500px;
            margin: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        input[type="text"], input[type="submit"] {
            font-size: 1em;
            padding: 10px;
            margin-top: 10px;
        }
        input[type="text"] {
            width: 100%;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        input[type="submit"] {
            background-color: #007bff;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
        }
        .header-record {
            margin-top: 40px;
            padding: 15px;
            border-left: 5px solid #007bff;
        }
        .detail-table {
            margin-top: 10px;
            margin-left: 20px;
            width: calc(100% - 40px);
            border-collapse: collapse;
        }
        .detail-table th, .detail-table td {
            padding: 8px;
            border: 1px solid #ccc;
            font-size: 0.9em;
        }
        .detail-table th {
            background-color: #007bff;
            color: white;
        }
        .no-results {
            color: red;
            text-align: center;
            font-weight: bold;
            margin-top: 30px;
        }
    </style>
</head>
<body>

<h2>Settlement Lookup by MFCUST and DATE or DATE RANGE</h2>

<div class="form-container">
    <form method="post">
        <label for="nbcust"><strong>Customer Number (SRCUST):</strong></label>
        <input type="text" name="nbcust" id="nbcust" value="<?= htmlspecialchars($nbcust) ?>" required>

        <label for="nbdate"><strong>Date (SRDATE - CCYYMMDD):</strong></label>
        <input type="text" name="nbdate" id="nbdate" value="<?= htmlspecialchars($nbdate) ?>" required>
        <label for="nbdate_end"><strong>To Date (optional):</strong></label>
        <input type="text" name="nbdate_end" id="nbdate_end" value="<?= htmlspecialchars($nbdate_end) ?>">


        <label for="srmrch"><strong>Merchant Code (SRMRCH - optional):</strong></label>
        <input type="text" name="nbmrch" id="nbmrch" value="<?= htmlspecialchars($nbmrch) ?>">


        <input type="submit" name="search" value="Search Records">
        <input type="submit" name="clear" value="Clear Form" style="background-color: #6c757d;">
    </form>
</div>

<?php if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['search'])): ?>
    <div style="margin-top: 20px; text-align: center;">
        <p style="display: inline-block; background-color: #4ef374ff; padding: 10px 15px; border-radius: 6px; margin: 5px;">
            <strong>Good Batches in Green</strong>
        </p>
        <p style="display: inline-block; background-color: #eb515eff; padding: 10px 15px; border-radius: 6px; margin: 5px;">
            <strong>Failed Batches in Red</strong>
        </p>
    </div>
<?php endif; ?>

<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['clear'])) {
        header("Location: " . $_SERVER['PHP_SELF']);
        exit;
    }

    if (!preg_match('/^\d+$/', $nbcust) || !preg_match('/^\d{8}$/', $nbdate)) {
    echo "<p class='no-results'>Invalid input. Customer number must be numeric and start date must be 8-digit (CCYYMMDD).</p>";
    exit;
}

if (!empty($nbdate_end) && !preg_match('/^\d{8}$/', $nbdate_end)) {
    echo "<p class='no-results'>End date must be 8 digits (CCYYMMDD) if entered.</p>";
    exit;
}


    $conn = db2_connect($database, $user, $password);
    if (!$conn) {
        echo "<p class='no-results'>Connection failed: " . db2_conn_errormsg() . "</p>";
        exit;
    }

    // New query: CCFP9610 (header) joined with CCFP9620 (detail)
    //$sql = "
     //   SELECT *
     //   FROM CURBSTONE.CCFP9610 SR
    //    LEFT JOIN CURBSTONE.CCFP9620 NB
     //     ON SR.SRCUST = NB.NBCUST
     //    AND SR.SRREQN = NB.NBREQN
    //     AND SR.SRMRCH = NB.NBMRCH
    //     AND SR.SRDATE = NB.NBDATE
    //    WHERE SR.SRCUST = ?
    //      AND SR.SRDATE = ?
    //    ORDER BY SR.SRDATE, SR.SRREQN, NB.NBTIME
    //";

    //$stmt = db2_prepare($conn, $sql);
    //if (!$stmt || !db2_execute($stmt, [$nbcust, $nbdate])) {

    $sql = "
    SELECT *
    FROM CURBSTONE.CCFP9610 SR
    LEFT JOIN CURBSTONE.CCFP9620 NB
      ON SR.SRCUST = NB.NBCUST
     AND SR.SRREQN = NB.NBREQN
     AND SR.SRMRCH = NB.NBMRCH
     AND SR.SRDATE = NB.NBDATE
    WHERE SR.SRCUST = ?
";

$params = [$nbcust];

if (!empty($nbdate_end)) {
    $sql .= " AND SR.SRDATE BETWEEN ? AND ?";
    $params[] = $nbdate;
    $params[] = $nbdate_end;
} else {
    $sql .= " AND SR.SRDATE = ?";
    $params[] = $nbdate;
}

if (!empty($nbmrch)) {
    $sql .= " AND SR.SRMRCH = ?";
    $params[] = $nbmrch;
}


$sql .= " ORDER BY SR.SRDATE, SR.SRREQN, NB.NBTIME";

$stmt = db2_prepare($conn, $sql);
if (!$stmt || !db2_execute($stmt, $params)) {
    


        echo "<p class='no-results'>SQL error: " . db2_stmt_errormsg() . "</p>";
        db2_close($conn);
        exit;
    }

    $grouped = [];

    while ($row = db2_fetch_assoc($stmt)) {
        $key = $row['SRCUST'] . '|' . $row['SRDATE'] . '|' . $row['SRREQN'] . '|' . $row['SRMRCH'];

        if (!isset($grouped[$key])) {
            $grouped[$key] = [
                'sr' => [
                    'SRCUST' => $row['SRCUST'],
                    'SRREQN' => $row['SRREQN'],
                    'SRMRCH' => $row['SRMRCH'],
                    'SRDATE' => $row['SRDATE'],
                    'SRRESP' => $row['SRRESP'] ?? '',
                    'SRTEXT' => $row['SRTEXT'] ?? ''
                ],
                'nb' => []
            ];
        }

        // Only add if NB part exists (LEFT JOIN)
        if (!empty($row['NBCUST'])) {
            $grouped[$key]['nb'][] = [
                'NBCUST' => $row['NBCUST'],
                'NBREQN' => $row['NBREQN'],
                'NBNUMB' => $row['NBNUMB'],
                'NBMRCH' => $row['NBMRCH'],
                'NBDATE' => $row['NBDATE'],
                'NBTIME' => $row['NBTIME'],
                'NBCHNL' => $row['NBCHNL'],
                'NBRSPT' => $row['NBRSPT'],
                'NBRSPC' => $row['NBRSPC'],
                'NBERRT' => $row['NBERRT']
            ];
        }
    }

    if (empty($grouped)) {
        echo "<p class='no-results'>No matching records found for SRCUST: <strong>$nbcust</strong> and SRDATE: <strong>$nbdate</strong>.</p>";
    } else {
        foreach ($grouped as $group) {
            $sr = $group['sr'];
            echo "<div class='header-record' style=\"background-color: #e0f7ff\">";
            echo "<strong style='color: #007bff;'>Header</strong><br>";
            echo "<strong>SRCUST:</strong> {$sr['SRCUST']} | ";
            echo "<strong>SRREQN:</strong> {$sr['SRREQN']} | ";
            echo "<strong>SRMRCH:</strong> {$sr['SRMRCH']} | ";
            echo "<strong>SRDATE:</strong> {$sr['SRDATE']} | ";
            echo "<strong>SRRESP:</strong> {$sr['SRRESP']} | ";
            echo "<strong>SRTEXT:</strong> {$sr['SRTEXT']}";
            echo "</div>";

            echo "<div style='margin-top: 10px; margin-left: 20px; font-weight: bold; color: #00000;'>Detail</div>";
            if (empty($group['nb'])) {
            echo "<p style='margin-left: 20px; color: #0b0000ff;background-color: #f9f93eff;'><b>No transactions found for this header.</b></p>";
            } else {
            echo "<table class='detail-table'>";
            echo "<tr><th>NBCUST</th><th>NBREQN</th><th>NBNUMB</th><th>NBMRCH</th><th>NBDATE</th><th>NBTIME</th><th>NBCHNL</th><th>NBRSPT</th><th>NBRSPC</th><th>NBERRT</th></tr>";

            foreach ($group['nb'] as $nb) {
                $nbchnl = trim($nb['NBCHNL']);
                $nbrspt = trim($nb['NBRSPT']);
                $nbrspc = trim($nb['NBRSPC']);

                $rowColor = '#eb515eff'; // Default red
                if (
                   ($nbchnl === '778' && $nbrspt === 'ACCEPTED') ||
                   ($nbchnl === '778' && $nbrspc === 'Succe') ||
                   ($nbchnl === '778' && $nbrspt === 'No transactions to s') ||
                   ($nbchnl === '778' && $nbrspt === 'OK')
                ){
                    $rowColor = '#4ef374ff'; // Green for 778/ACCEPTED/Succe
                }
                elseif ($nbchnl === '878' && strpos($nbrspt, 'OK ') === 0) {
                    $rowColor = '#4ef374ff'; // Green for 878/OK
                }

                // build the parameters to pass on the lus_dets.php call
                $params = [
                  'nbcust' => $nb['NBCUST'],
                  'nbreqn' => $nb['NBREQN'],
                  'nbnumb' => $nb['NBNUMB'],
                  'nbmrch' => $nb['NBMRCH'],
                ];
                $rowUrl = 'lus_dets.php?' . http_build_query($params);
                $safeRowUrl = htmlspecialchars($rowUrl, ENT_QUOTES); // safe for use in JS string
               // make the row clickable to display batch transactions if available
                 echo "<tr style=\"background-color: $rowColor; cursor: pointer;\" onclick=\"window.open('$safeRowUrl','_blank')\">";
            //   echo "<tr style=\"background-color: $rowColor\">";
                foreach ($nb as $val) {
                    echo "<td>" . htmlspecialchars($val) . "</td>";
                }
                echo "</tr>";
            }        

            echo "</table>";
        }
        
        }
    }

    db2_close($conn);
}
?>
</body>
</html>

