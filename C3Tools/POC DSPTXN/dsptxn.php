<?php

// get the connection credentials from the /www/phpweb/cs/cs_menu.ini file
$config = parse_ini_file('/www/phpweb/cs/cs_menu.ini', true);

$user = $config['config']['user'];
$password = $config['config']['password'];
$database = $config['config']['dbname'];

// IBM i DB2 connection info
//$user = "C3GUI";         // ?  Change this to your IBM i user
//$password = "QAZSE4RFVZ"; // ?   Change this to your IBM i password
//$database = "*LOCAL";     // Usually *LOCAL for DB2 on IBM i


// Accept tranid from GET or POST, with GET taking priority
if (isset($_GET['tranid']) && $_GET['tranid'] !== '') {
    $tranId = strtoupper(trim($_GET['tranid']));
} elseif (isset($_POST['tranid']) && $_POST['tranid'] !== '') {
    $tranId = strtoupper(trim($_POST['tranid']));
} else {
    $tranId = '';
}


?>
<!DOCTYPE html>
<html>
<head>
    <title>Transaction Display</title>
    <style>
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #f4f4f8;
            margin: 40px;
        }
        .form-container {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            max-width: 500px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        input[type="text"], input[type="submit"] {
            padding: 10px;
            font-size: 1em;
            margin-top: 5px;
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
            margin-top: 10px;
        }
        .card {
            background: white;
            border-radius: 10px;
            padding: 30px;
            max-width: 1000px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .card h2 {
            margin-top: 0;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
            color: #333;
        }
        .card h3 {
            margin-top: 30px;
            font-size: 1.2em;
            color: #007bff;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .field-box {
            background-color: #f9fafc;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #ddd;
        }
        .field-label {
            font-weight: bold;
            color: #555;
            font-size: 0.95em;
        }
        .field-value {
            font-size: 1.05em;
            color: #222;
            margin-top: 4px;
            word-wrap: break-word;
        }
        .error {
            color: red;
            font-weight: bold;
        }
    </style>
</head>
<body>

<h2>Lookup Transaction by MFUKEY</h2>
<div style="display: flex; gap: 30px; ">
<!-- Left: Input Form -->
<div class="form-container" style="flex: 1; min-width: 300px; text-align: left;">
    <form method="post">
        <label for="tranid"><strong>Transaction ID (MFUKEY):</strong></label>
        <input type="text" name="tranid" id="tranid" value="<?= htmlspecialchars($tranId, ENT_QUOTES) ?>" required maxlength="15">
        <input type="submit" value="Find Transaction">
    </form>
</div>

<!-- Right: Message Box -->
    <div class="form-container" style="flex: 1; min-width: 300px; background-color: #fefefe; border-left: 4px solid #007bff;">
        <p style="margin: 0; font-size: 0.95em; color: #444;">
            <strong>Note:</strong><br>
            Not all fields are displayed. Some fields are only included if not blank, and others are omitted due to need.<br><br>
            If a field is missing that you'd like to see, we can add it as long as it has a value.
        </p>
    </div>

</div>

<?php
 if ($tranId !== '') {
    if (strlen($tranId) !== 15) {
        echo "<p class='error'>Invalid Transaction ID. MFUKEY must be exactly 15 characters.</p>";
        exit;
    }
    if (!preg_match('/^[a-zA-Z0-9]+$/', $tranId)) {
        echo "<p class='error'>Invalid Transaction ID. Use only letters and numbers.</p>";
        exit;
    }

    $conn = db2_connect($database, $user, $password);
    if (!$conn) {
        echo "<p class='error'>Connection failed: " . db2_conn_errormsg() . "</p>";
        exit;
    }

    $sql = <<<SQL
SELECT 
    MFCUST, MFTYPE, MFTYP2, MFRTRN, MFDATE, MFTIME, MFUSER, MFCARD, MFEDAT,
    MFMRCH, MFADD1, MFZIPC, MFORDR, MFREFR, MFAMT1, MFSETR, MFMETH, MFAMT2, MFLTXF,
    MFDSTZ, MFAPPR, MFKEYP, MFRTXT, MFRAVS, MFRCVV, "MF\$RAQ", "MF\$FTS",
    MFREQN, MFNUMB, MFSETD, MFSETT, MFPRCD, MFPRCT, MFCHKT, "MF\$SLD", "MF\$SLG",
    "MF\$LVD", "MF\$RVG",MFTRK1,MFXTRA,MFRVNA,MFACNL,MFDATA,MFUSDA,MFUSDB,MFUSDC,
    MFUSD1,MFUSD2,MFUSD3,MFUSD4,MFUSD5,MFUSD6,MFUSD7,MFUSD8,MFUSD9,MFVALU,MFADD2,MFSTID
FROM 
    CURBSTONE.CCFP9020
WHERE 
    MFUKEY = ?
SQL;

    $stmt = db2_prepare($conn, $sql);
    if (!$stmt) {
        echo "<p class='error'>Prepare failed: " . db2_stmt_errormsg() . "</p>";
        db2_close($conn);
        exit;
    }

    $exec = db2_execute($stmt, [$tranId]);
    if (!$exec) {
        echo "<p class='error'>Query execution failed: " . db2_stmt_errormsg() . "</p>";
        db2_close($conn);
        exit;
    }

    $fieldLabels = [
    "MFCUST"   => "Customer Number",
    "MFDATE"   => "Transaction Date",
    "MFTIME"   => "Transaction Time",
    "MFREQN"   => "Set Request Number",
    "MFNUMB"   => "Set Batch Number",
    "MFUSER"   => "User ID",
    "MFTYPE"   => "Transaction Type",
    "MFTYP2"   => "Secondary Type",
    "MFRTRN"   => "Response Code",
    "MFRTXT"   => "Response Text",
    
    "MFAMT1"   => "Transaction Amount",
    "MFAMT2"   => "Tax Amount",
    "MFSETR"   => "Settlement Amount",
    "MFSETD"   => "Settlement Date",
    "MFSETT"   => "Settlement Time",
    "MFAPPR"   => "Approval Code",
    "MFKEYP"   => "Previous Key",
    "MFMETH"   => "Method",
    "MFLTXF"   => "Tax Flag",
    "MFDSTZ"   => "Destination ZipCode",
    
    "MFCARD"   => "Card Number",
    "MFEDAT"   => "Card Expiry",
    "MFRAVS"   => "AVS Result",
    "MFRCVV"   => "CVV Result",
        
    "MFORDR"   => "Order Number",
    "MFREFR"   => "Reference #",
    "MFPRCD"   => "Network Process Date",
    "MFPRCT"   => "Network Process Time",
    "MFCHKT"   => "Card-D/C",
    
    "MFMRCH"   => "Merchant Code",
    "MFADD1"   => "Cardholder Address",
    "MFZIPC"   => "Cardholder ZIP",
    "MFADD2"   => "Address 2/EMV Device",
    "MFSTID"   => "EMV Device Type",
    
    'MF$SLD'   => "Settled Denied Flag",
    'MF$SLG'   => "Settled Granted Flag",
    'MF$LVD'   => "Local Void Flag",
    'MF$RVG'   => "Network Reversal Flag",
    'MF$RAQ'   => "Req Auth Flag",
    'MF$FTS'   => "FTS Flag",
    'MFTRK1'   => "BIN Data",
    'MFRVNA'   => "Card Brand",
    'MFACNL'   => "Network Auth Channel"
];

    $row = db2_fetch_assoc($stmt);
    if (!$row) {
        echo "<p class='error'>No transaction found with ID: <strong>" . htmlspecialchars($tranId) . "</strong></p>";
    } else {
        echo "<div class='card'>";
        // --- Check for LIII Card ---
        $mfacnl = isset($row['MFACNL']) ? trim($row['MFACNL']) : '';
        $mfrvna = isset($row['MFRVNA']) ? trim($row['MFRVNA']) : '';
        $mfxtra = isset($row['MFXTRA']) ? trim($row['MFXTRA']) : '';
        $mfdata = '';
        if (isset($row['MFDATA']) && substr($row['MFDATA'], 0, 6) === 'PurCrd') {
            $mfdata = 'PurCrd';
        }
        $liiiCard = false;

    if (
        $mfacnl == '777' &&
        preg_match('/VISA|MC\/D|MAST/i', $mfrvna) &&
        isset($mfxtra[5]) &&
        $mfxtra[5] !== '0' && $mfxtra[5] !== ' '
    ) {
        $liiiCard = true;
    }

    if (
        $mfacnl == '877' && $mfdata == 'PurCrd'
    ) {
        $liiiCard = true;
    }

        echo "<h2>Transaction Details - MFUKEY: " . htmlspecialchars($tranId) . "</h2>";

    function renderFieldGroup($title, $fields, $row) {
        global $fieldLabels; // access the labels array
        echo "<h3>$title</h3>";
        echo "<div class='grid'>";
        foreach ($fields as $field) {
            if (isset($row[$field])&& trim($row[$field]) !== '') {
                $label = isset($fieldLabels[$field]) ? $fieldLabels[$field] : $field;
                echo "<div class='field-box'>";
                echo "<div class='field-label'>" . htmlspecialchars($label) . " <span style='color: #aaa;'>($field)</span></div>";
                echo "<div class='field-value'>" . htmlspecialchars($row[$field]) . "</div>";
                echo "</div>";
            }
        }
    echo "</div>";
    }   

       
        // Display groups
        renderFieldGroup("?? Transaction Info", [
            "MFTYPE", "MFTYP2","MFDATE", "MFTIME", "MFPRCD", "MFPRCT", "MFUSER","MFRTRN", "MFRTXT"
        ], $row);

        renderFieldGroup("?? Payment Info", [
            "MFAMT1", "MFAMT2", "MFSETR", "MFAPPR", "MFKEYP", "MFMETH", "MFLTXF", "MFDSTZ", "MFVALU","MFADD2","MFSTID"
        ], $row);

        echo "<h3>?? Card Info</h3>";
        echo "<div class='grid'>";

        $cardFields = ["MFCARD", "MFEDAT", "MFCHKT", "MFRAVS", "MFRCVV", "MFADD1", "MFZIPC", "MFTRK1","MFRVNA"];
        foreach ($cardFields as $field) {
          if (isset($row[$field])&& trim($row[$field]) !== '') {
             $label = isset($fieldLabels[$field]) ? $fieldLabels[$field] : $field;
              echo "<div class='field-box'>";
              echo "<div class='field-label'>" . htmlspecialchars($label) . " <span style='color: #aaa;'>($field)</span></div>";
              echo "<div class='field-value'>" . htmlspecialchars($row[$field]) . "</div>";
              echo "</div>";
            }
        }

        // ?? Add LIII Card field visually
        if ($liiiCard) {
        echo "<div class='field-box' style='background-color: #e3fce3; border: 1px solid #5cb85c;'>";
        echo "<div class='field-label'>Card Type</div>";
        echo "<div class='field-value' style='color: green; font-weight: bold;'>LIII Card</div>";
        echo "</div>";
        }

        echo "</div>"; // end grid


        //renderFieldGroup("?? Card Info", [
        //    "MFCARD", "MFEDAT", "MFCHKT", "MFRAVS", "MFRCVV", "MFADD1", "MFZIPC","MFTRK1"
        //], $row);

        renderFieldGroup("?? Order Info", [
            "MFORDR", "MFREFR"
        ], $row);

        renderFieldGroup("?? Merchant Info", [
            "MFCUST","MFMRCH"
        ], $row);

        renderFieldGroup("?? Settlement Info",[
            "MFSETD", "MFSETT", "MFREQN", "MFNUMB"
        ], $row);

        renderFieldGroup("?? Flagging / Status Info", [
            "MF\$RAQ", "MF\$FTS", "MF\$SLD", "MF\$SLG", "MF\$LVD", "MF\$RVG"
        ], $row);

        renderFieldGroup("?? User Defined Fields", [
            "MFUSDA","MFUSDB","MFUSDC","MFUSD1","MFUSD2","MFUSD3","MFUSD4",
            "MFUSD5","MFUSD6","MFUSD7","MFUSD8","MFUSD9"
        ], $row);

        echo "</div>"; // end card
    }

    db2_close($conn);
}
?>

</body>
</html>





