<?php

// get the connection credentials from the /www/phpweb/cs/cs_menu.ini file
$config = parse_ini_file('/www/phpweb/cs/cs_menu.ini', true);

$user = $config['config']['user'];
$password = $config['config']['password'];
$database = $config['config']['dbname'];

// DB2 connection credentials
//$user = "C3GUI";         // â€  Replace with your IBM i username
//$password = "QAZSE4RFVZ"; // â   Replace with your password
//$database = "*LOCAL";     // Use *LOCAL when running on IBM i

// Capture the form input
$nbdate = isset($_POST['nbdate']) ? trim($_POST['nbdate']) : '';

?>
<!DOCTYPE html>
<html>
<head>
    <title>Failed Settlements</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        input[type="text"] { padding: 6px; font-size: 1em; width: 150px; }
        input[type="submit"] { padding: 6px 12px; font-size: 1em; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
        th:last-child { background-color: #E4D00A;}
        tr:nth-child(even) { background-color: #fafafa; }
        .error { color: red; }
    </style>
</head>
<body>
    <h2>Failed Settlements</h2>
    <b>This query will show all Settlement Batches for date entered and forward that have failed.</b><br><br><br>
    <form method="post">
        <label for="nbdate">Enter NBDATE (CCYYMMDD): </label>
        <input type="text" name="nbdate" id="nbdate" value="<?= htmlspecialchars($nbdate) ?>" pattern="\d{8}" required>
        <input type="submit" value="Search">
    </form>

<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validate date input
    if (!preg_match('/^\d{8}$/', $nbdate)) {
        echo "<p class='error'>Invalid date format. Please use CCYYMMDD.</p>";
        exit;
    }

    // Connect to DB2
    $conn = db2_connect($database, $user, $password);
    if (!$conn) {
        echo "<p class='error'>Connection failed: " . db2_conn_errormsg() . "</p>";
        exit;
    }

    // Prepare the SQL query with a parameter for nbdate
    $sql = <<<SQL
SELECT 
    nbcust, nbreqn, nbnumb, nbmrch, nbchnl, nbdate, nbtime,
    nbrspt, nberrt, nbefld, nbrspc, srukey,mfrtxt
FROM 
    curbstone.ccfp9620
JOIN 
    curbstone.ccfp9610 
    ON srcust = nbcust AND srreqn = nbreqn
INNER JOIN
    curbstone.ccfp9020
    on srukey = mfukey
WHERE 
    nbdate >= ?
    AND nbrspt NOT LIKE 'OK%'
    AND nbrspt NOT LIKE ' ACCEPTED%'
    AND nbrspt NOT LIKE 'No trans%'
    AND nbrspt NOT LIKE 'OMMUNIC%'
    AND nbrspt NOT LIKE 'CONNECT%'
    AND nbrspt NOT LIKE 'DECLINE%'
    AND nbrspt NOT LIKE 'ION ERR%'
    AND nbrspt NOT LIKE 'RECEIVE ERR%'
    AND nbrspt NOT LIKE 'POSLINK%'
    AND nbchnl <> '999'
    AND nbnumb <> '00000000'
    AND nbmrch <> '97889'
    AND nbrspt <> 'GB'
    AND NBRSPC NOT IN ('Succe', 'Failu')
    AND nbrspt NOT LIKE 'Re-opened%'
ORDER BY 
    nbdate, nbtime, nbcust, nbmrch
SQL;

    $stmt = db2_prepare($conn, $sql);
    if (!$stmt) {
        echo "<p class='error'>Prepare failed: " . db2_stmt_errormsg() . "</p>";
        db2_close($conn);
        exit;
    }

    $exec = db2_execute($stmt, [$nbdate]);
    if (!$exec) {
        echo "<p class='error'>Query execution failed: " . db2_stmt_errormsg() . "</p>";
        db2_close($conn);
        exit;
    }

    // Output results
    echo "<table><tr>";
    $colCount = db2_num_fields($stmt);
    for ($i = 0; $i < $colCount; $i++) {
        echo "<th>" . htmlspecialchars(db2_field_name($stmt, $i)) . "</th>";
    }
    echo "</tr>";

    $hasRows = false;
    while ($row = db2_fetch_assoc($stmt)) {
        $hasRows = true;
        echo "<tr onclick=\"window.open('dets.php?nbcust=" . urlencode($row['NBCUST']) . 
    "&nbreqn=" . urlencode($row['NBREQN']) . 
    "&nbnumb=" . urlencode($row['NBNUMB']) . 
    "&nbmrch=" . urlencode($row['NBMRCH']) . "', '_blank')\" style='cursor:pointer'>";
foreach ($row as $value) {
    echo "<td>" . htmlspecialchars($value) . "</td>";
}
echo "</tr>";

    }

    if (!$hasRows) {
        echo "<tr><td colspan='{$colCount}'>No records found for the given date.</td></tr>";
    }

    echo "</table>";
    db2_close($conn);
}
?>
</body>
</html>
