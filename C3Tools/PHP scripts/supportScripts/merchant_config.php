<?php

// get the connection credentials from the /www/phpweb/cs/cs_menu.ini file
$config = parse_ini_file('/www/phpweb/cs/cs_menu.ini', true);

$ibmiUser = $config['config']['user'];
$ibmiPassword = $config['config']['password'];
$ibmiLibrary = $config['config']['dbname'];

// Set up IBM i DB2 connection parameters
//$ibmiUser = 'C3GUI';
//$ibmiPassword = 'QAZSE4RFVZ';
//$ibmiLibrary = '*LOCAL'; // use *LOCAL for local system
$connection = db2_connect($ibmiLibrary, $ibmiUser, $ibmiPassword);

// Check for connection
if (!$connection) {
    die("Connection failed: " . db2_conn_errormsg());
}

// Get the customer number from input or form
$customerNumber = isset($_GET['customer']) ? strtoupper(trim($_GET['customer'])) : '';
$merchantCode = isset($_GET['merchant']) ? strtoupper(trim($_GET['merchant'])) : '';

?>
<!DOCTYPE html>
<html>
<head>
    <title>Merchant Config</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 40px;
            background-color: #f9f9f9;
            color: #333;
        }

        h1 {
            font-size: 32px;
            color: #2c3e50;
            text-align: center;
            margin-bottom: 40px;
        }

        h2, h3 {
            color: #34495e;
            margin-top: 40px;
        }

        .form-container {
            text-align: center;
            margin-bottom: 30px;
        }

        input[type="text"] {
            padding: 8px;
            font-size: 16px;
            width: 300px;
        }

        button {
            padding: 8px 16px;
            font-size: 16px;
            margin-left: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        button[type="submit"] {
            background-color: #3498db;
            color: white;
        }

        button[type="button"] {
            background-color: #95a5a6;
            color: white;
        }

        table {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            margin-bottom: 40px;
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }

        th, td {
            padding: 12px 15px;
            text-align: left;
        }

        th {
            background-color: #2980b9;
            color: white;
            font-weight: bold;
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

<h1>Merchant Config</h1>
 <div class="form-container">
     <form method="get" style="display: inline-block; text-align: left;">
         <div style="margin-bottom: 15px;">
             <label for="customer"><strong>MFCUST (Customer Number)</strong> <span style="color: red;">(Required)</span></label><br>
             <input type="text" name="customer" id="customer" value="<?= htmlspecialchars($customerNumber) ?>" required>
         </div>

         <div style="margin-bottom: 25px;">
             <label for="merchant"><strong>MFMRCH (Merchant Code)</strong> <span style="color: #888;">(Optional)</span></label><br>
             <input type="text" name="merchant" id="merchant" value="<?= htmlspecialchars($merchantCode) ?>">
         </div>

         <div style="text-align: center;">
             <button type="submit">Search</button>
             <button type="button" onclick="window.location.href=window.location.pathname">Clear</button>
         </div>
     </form>
 </div>
<?php
if ($customerNumber) {
    echo "<h2>Results for Customer: " . htmlspecialchars($customerNumber) . "</h2>";

    // 1. Query from curbstone/ccfp5010
    $sql5010 = "SELECT * FROM curbstone.ccfp5010 WHERE cscust = ?";
    $stmt5010 = db2_prepare($connection, $sql5010);

    if ($stmt5010 && db2_execute($stmt5010, [$customerNumber])) {
        echo "<h3>File: ccfp5010</h3>";
        echo "<table><tr>";

        // Get field names
        $numCols = db2_num_fields($stmt5010);
        for ($i = 0; $i < $numCols; $i++) {
            echo "<th>" . db2_field_name($stmt5010, $i) . "</th>";
        }
        echo "</tr>";

        // Fetch and display rows
        while ($row = db2_fetch_assoc($stmt5010)) {
            echo "<tr>";
            foreach ($row as $value) {
                echo "<td>" . htmlspecialchars($value) . "</td>";
            }
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>Error fetching data from ccfp5010: " . db2_stmt_errormsg() . "</p>";
    }

    // 2. Query from curbstone/ccfp3030
    if ($merchantCode) {
        $sql3030 = "SELECT * FROM curbstone.ccfp3030 WHERE mhcust = ? AND mhmrch = ? ORDER BY mhmrch";
        $stmt3030 = db2_prepare($connection, $sql3030);
        $params3030 = [$customerNumber, $merchantCode];
    } else {
        $sql3030 = "SELECT * FROM curbstone.ccfp3030 WHERE mhcust = ? ORDER BY mhmrch";
        $stmt3030 = db2_prepare($connection, $sql3030);
        $params3030 = [$customerNumber];
    }

    if ($stmt3030 && db2_execute($stmt3030, $params3030)) {

    //$sql3030 = "SELECT * FROM curbstone.ccfp3030 WHERE mhcust = ? ORDER BY mhmrch";
    //$stmt3030 = db2_prepare($connection, $sql3030);

    //if ($stmt3030 && db2_execute($stmt3030, [$customerNumber])) {
    echo "<h3>File: ccfp3030</h3>";
    echo "<table><tr>";

        // Get field names
      $numCols = db2_num_fields($stmt3030);
      for ($i = 0; $i < $numCols; $i++) {
          echo "<th>" . db2_field_name($stmt3030, $i) . "</th>";
      }
       echo "</tr>";

        // Fetch and display rows
        while ($row = db2_fetch_assoc($stmt3030)) {
    $link = "merchant_detail.php?mhmrch=" . urlencode($row['MHMRCH']) . "&mhcust=" . urlencode($row['MHCUST']);
    echo "<tr onclick=\"window.location.href='$link'\" style=\"cursor:pointer;\">";
    foreach ($row as $value) {
        echo "<td>" . htmlspecialchars($value) . "</td>";
    }
    echo "</tr>";
}

        echo "</table>";
    } else {
        echo "<p>Error fetching data from ccfp3030: " . db2_stmt_errormsg() . "</p>";
    }

    // Close connection
    db2_close($connection);
}
?>

</body>
</html>






