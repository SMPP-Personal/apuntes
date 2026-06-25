import argparse
import pathlib
import re


def find_links(html_path: pathlib.Path):
    content = html_path.read_text(encoding='utf-8')
    matches = re.findall(r'href="([^"]+)"', content)
    return matches


def validate_links(html_path: pathlib.Path):
    links = find_links(html_path)
    relative_links = [link for link in links if not link.startswith(('http://', 'https://', '#', 'mailto:'))]
    missing = []
    for link in relative_links:
        target = (html_path.parent / link).resolve()
        if not target.exists():
            missing.append((link, target))
    return relative_links, missing


def main():
    parser = argparse.ArgumentParser(description='Validate relative links in an HTML file.')
    parser.add_argument('html_file', nargs='?', default='index.html', help='HTML file to check (default: index.html)')
    args = parser.parse_args()

    html_path = pathlib.Path(args.html_file)
    if not html_path.exists():
        raise SystemExit(f'Error: HTML file not found: {html_path}')

    relative_links, missing = validate_links(html_path)

    print(f'HTML FILE: {html_path}')
    print(f'TOTAL LINKS: {len(relative_links)}')
    print(f'BROKEN LINKS: {len(missing)}')
    if missing:
        print('\nMissing targets:')
        for link, target in missing:
            print(f'- {link} -> {target}')


if __name__ == '__main__':
    main()
