<?php
// Default routing for /admin/ - redirect to login
// Authentication is handled via localStorage in the frontend
header('Location: login.html');
exit();
