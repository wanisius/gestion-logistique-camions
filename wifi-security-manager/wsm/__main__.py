"""Point d'entrée : python -m wsm <commande>."""

from __future__ import annotations

import argparse
import sys

from . import __version__


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    p = argparse.ArgumentParser(prog="wsm", description="WiFi Security Manager — audit local non destructif.")
    p.add_argument("--version", action="version", version=__version__)
    sub = p.add_subparsers(dest="cmd")
    d = sub.add_parser("diagnose", help="diagnostic initial du réseau et du routeur (rapport Markdown)")
    d.add_argument("--no-ping", action="store_true", help="n'envoyer aucun ping (table ARP seule)")
    s = sub.add_parser("serve", help="tableau de bord + surveillance périodique (défaut)")
    s.add_argument("--port", type=int, default=8765)
    s.add_argument("--no-browser", action="store_true")
    s.add_argument("--no-monitor", action="store_true", help="pas de scan périodique")
    sub.add_parser("monitor", help="surveillance en arrière-plan, sans ouvrir le navigateur (démarrage de Windows)")
    sub.add_parser("update-oui", help="télécharger la base des fabricants (IEEE, public)")
    args = p.parse_args(argv)

    if args.cmd == "diagnose":
        from .diagnose import run
        run(full_sweep=not args.no_ping)
    elif args.cmd == "monitor":
        # Même processus que le tableau de bord : un seul écrivain pour les données.
        from .server import serve
        serve(open_browser=False, monitor=True)
    elif args.cmd == "update-oui":
        from .oui import update_database
        print("Téléchargement du registre OUI de l'IEEE…")
        print(f"{update_database()} fabricants enregistrés.")
    else:
        from .server import serve
        serve(port=getattr(args, "port", 8765), open_browser=not getattr(args, "no_browser", False),
              monitor=not getattr(args, "no_monitor", False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
