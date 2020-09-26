<?php

class SynoDLMSearchRutracker {
  private $qurl = 'http://localhost:3700/search?query=';

  public function __construct() { }

  public function prepare($curl, $query) {
    $url = $this->qurl . urlencode($query);
    curl_setopt($curl, CURLOPT_URL, $url);
  }

  public function parse($plugin, $response) {
    return $plugin->addJsonResults(
      $response,
      'torrents',
      array(
        'title' => 'title',
        'download' => 'download',
        'hash' => 'hash',
        'size' => 'size',
        'page' => 'page',
        'date' => 'datetime',
        'seeds' => 'seeds',
        'leechs' => 'leechs',
        'category' => 'category'
      )
    );
  }
}

?>
