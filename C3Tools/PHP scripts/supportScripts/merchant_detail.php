<?php

// get the connection credentials from the /www/phpweb/cs/cs_menu.ini file
$config = parse_ini_file('/www/phpweb/cs/cs_menu.ini', true);

$ibmiUser = $config['config']['user'];
$ibmiPassword = $config['config']['password'];
$ibmiLibrary = $config['config']['dbname'];

// Set up IBM i DB2 connection parameters
//$ibmiUser = 'C3GUI';
//$ibmiPassword = 'QAZSE4RFVZ';
//$ibmiLibrary = '*LOCAL'; /  use *LOCAL for local system
$connection = db2_connect($ibmiLibrary, $ibmiUser, $ibmiPassword);

if (!$connection) {
    die("Connection failed: " . db2_conn_errormsg());
}

$mhmrch = isset($_GET['mhmrch']) ? strtoupper(trim($_GET['mhmrch'])) : '';
$mhcust = isset($_GET['mhcust']) ? strtoupper(trim($_GET['mhcust'])) : '';
?>
<!DOCTYPE html>
<html>
<head>
    <title>Merchant Code Details</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background-color: #f9f9f9;
        }

        .header-info {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-bottom: 20px;
            font-size: 18px;
            color: #34495e;
        }

        h1 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 30px;
        }

        a {
            text-decoration: none;
            color: #3498db;
            display: inline-block;
            margin-bottom: 20px;
        }

        table {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            background-color: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            overflow: hidden;
        }

        th, td {
            padding: 12px 15px;
            text-align: left;
        }

        th {
            background-color: #2c3e50;
            color: white;
        }

        tr:nth-child(even) {
            background-color: #f2f2f2;
        }

        tr:hover {
            background-color: #e1f5fe;
        }
    </style>
</head>
<body>

<h1>Merchant Detail</h1>
<?php if ($mhmrch && $mhcust): ?>
    <div class="header-info">
        <div><strong>Customer Number (MHCUST):</strong> <?= htmlspecialchars($mhcust) ?></div>
        <div><strong>Merchant ID (MHMRCH):</strong> <?= htmlspecialchars($mhmrch) ?></div>
    </div>
<?php endif; ?>
<a href="merchant_config.php?customer=<?= urlencode($mhcust) ?>">â   Back to Merchant Config</a>

<?php
if ($mhmrch && $mhcust) {
    $sql = "SELECT * FROM curbstone.ccfp5055 WHERE cimrch = ? AND cicust = ?";
    $stmt = db2_prepare($connection, $sql);

    if ($stmt && db2_execute($stmt, [$mhmrch, $mhcust])) {
        echo "<table><tr>";
        $numCols = db2_num_fields($stmt);
        for ($i = 0; $i < $numCols; $i++) {
            echo "<th>" . db2_field_name($stmt, $i) . "</th>";
        }
        echo "</tr>";

        $rowsExist = false;
        while ($row = db2_fetch_assoc($stmt)) {
            $rowsExist = true;
            echo "<tr>";
            foreach ($row as $value) {
                echo "<td>" . htmlspecialchars($value) . "</td>";
            }
            echo "</tr>";
        }

        if (!$rowsExist) {
            echo "<tr><td colspan='$numCols'>No detail records found.</td></tr>";
        }

        echo "</table>";
    } else {
        echo "<p>Error retrieving details: " . db2_stmt_errormsg() . "</p>";
    }
} else {
    echo "<p>Missing merchant or customer ID.</p>";
}

db2_close($connection);
?>
</body>
</html>






