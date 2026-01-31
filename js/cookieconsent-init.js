/**
 * Cookie Consent (orestbida/cookieconsent v2.9.2) – Greek, GDPR, dark theme.
 * GA runs only after "Αποδοχή όλων" (page_scripts + data-cookiecategory="analytics").
 */
(function () {
  if (typeof initCookieConsent !== 'function') return;
  var cc = initCookieConsent();
  cc.run({
    current_lang: document.documentElement.getAttribute('lang') || 'el',
    autoclear_cookies: true,
    page_scripts: true,
    mode: 'opt-in',
    gui_options: {
      consent_modal: {
        layout: 'bar',
        position: 'bottom center',
        transition: 'slide',
        swap_buttons: false
      },
      settings_modal: {
        layout: 'box',
        position: 'right',
        transition: 'slide'
      }
    },
    languages: {
      el: {
        consent_modal: {
          title: 'Χρησιμοποιούμε cookies! 🍪',
          description: 'Για να κάνουμε το NewsLab ακόμα καλύτερο, χρησιμοποιούμε ορισμένα απαραίτητα cookies και τα analytics της Google. Με τη συγκατάθεσή σου, μας βοηθάς να καταλάβουμε ποιες ειδήσεις σε ενδιαφέρουν περισσότερο!',
          primary_btn: { text: 'Αποδοχή όλων', role: 'accept_all' },
          secondary_btn: { text: 'Απόρριψη', role: 'accept_necessary' }
        },
        settings_modal: {
          title: 'Ρυθμίσεις cookies',
          save_settings_btn: 'Αποθήκευση',
          accept_all_btn: 'Αποδοχή όλων',
          reject_all_btn: 'Απόρριψη',
          close_btn_label: 'Κλείσιμο',
          cookie_table_headers: [
            { col1: 'Cookie', col2: 'Domain', col3: 'Λήξη', col4: 'Περιγραφή' }
          ],
          blocks: [
            {
              title: 'Πληροφορίες',
              description: 'Μπορείτε να αλλάξετε τις προτιμήσεις cookies ανά πάσα στιγμή. Για λεπτομέρειες δείτε την <a href="policy.html" class="cc-link">Πολιτική Απορρήτου</a>.'
            },
            {
              title: 'Απαραίτητα cookies',
              description: 'Απαιτούνται για τη λειτουργία του ιστότοπου.',
              toggle: { value: 'necessary', enabled: true, readonly: true }
            },
            {
              title: 'Αναλυτικά cookies (Google Analytics)',
              description: 'Συλλέγουν πληροφορίες για την επισκεψιμότητα (ανωνυμοποιημένα).',
              toggle: { value: 'analytics', enabled: false, readonly: false },
              cookie_table: [
                { col1: '^_ga', col2: 'google.com', col3: '2 χρόνια', col4: 'Google Analytics', is_regex: true },
                { col1: '_gid', col2: 'google.com', col3: '1 ημέρα', col4: 'Google Analytics' }
              ]
            }
          ]
        }
      }
    }
  });
})();
