<?php

// get the connection credentials from the /www/phpweb/cs/cs_menu.ini file
$config = parse_ini_file('/www/phpweb/cs/cs_menu.ini', true);

$user = $config['config']['user'];
$password = $config['config']['password'];
$database = $config['config']['dbname'];

// DB2 connection credentials
//$user = "C3GUI";
//$password = "QAZSE4RFVZ";
//$database = "*LOCAL";

// Get parameters from URL
$nbcust = $_GET['nbcust'] ?? '';
$nbreqn = $_GET['nbreqn'] ?? '';
$nbnumb = $_GET['nbnumb'] ?? '';
$nbmrch = $_GET['nbmrch'] ?? '';

// Validate input
if (!$nbcust || !$nbreqn || !$nbnumb || !$nbmrch) {
    echo "<p class='error'>Missing required parameters.</p>";
    exit;
}

// Connect to DB2
$conn = db2_connect($database, $user, $password);
if (!$conn) {
    echo "<p class='error'>Connection failed: " . db2_conn_errormsg() . "</p>";
    exit;
}

// Prepare SQL
$sql = <<<SQL
SELECT 
    MFUKEY, MFMRCH, MFTYPE, MFTYP2, MF\$FTS, MF\$SLQ, MF\$SLD, MFAMT1, MFSETR, MFREQN, MFNUMB
FROM 
    curbstone.ccfp9020
WHERE 
    MFCUST = ? AND MFREQN = ? AND MFNUMB = ? AND MFMRCH = ?
ORDER BY 
    MFUKEY
SQL;

$stmt = db2_prepare($conn, $sql);
if (!$stmt) {
    echo "<p class='error'>Prepare failed: " . db2_stmt_errormsg() . "</p>";
    db2_close($conn);
    exit;
}

$exec = db2_execute($stmt, [$nbcust, $nbreqn, $nbnumb, $nbmrch]);
if (!$exec) {
    echo "<p class='error'>Query execution failed: " . db2_stmt_errormsg() . "</p>";
    db2_close($conn);
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Transaction Details</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
        tr:nth-child(even) { background-color: #fafafa; }
        a.back { display: inline-block; margin-top: 20px; }
    </style>
</head>
<body>
    <h2>Transaction Details for Customer: <?= htmlspecialchars($nbcust) ?></h2>
    <table>
        <tr>
            <th>MFUKEY</th><th>MFMRCH</th><th>MFTYPE</th><th>MFTYP2</th>
            <th>MF$FTS</th><th>MF$SLQ</th><th>MF$SLD</th>
            <th>MFAMT1</th><th>MFSETR</th><th>MFREQN</th><th>MFNUMB</th>
        </tr>
<?php
$hasRows = false;
while ($row = db2_fetch_assoc($stmt)) {
    $hasRows = true;
    echo "<tr>";
    foreach ($row as $val) {
        echo "<td>" . htmlspecialchars($val) . "</td>";
    }
    echo "</tr>";
}
if (!$hasRows) {
    echo "<tr><td colspan='11'>No related transactions found.</td></tr>";
}
?>
    </table>
    <br><strong>Close this tab when done!</strong>
</body>
</html>
<?php db2_close($conn); ?>
