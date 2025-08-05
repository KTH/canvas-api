# This is a nix shell file that will install all the dependencies needed to run the webdev project
# Instructions can be found in README.md.
let
  sources = import ./nix/sources.nix;
  pkgs = import sources.nixpkgs {};

in pkgs.mkShell rec {
  name = "webdev";

  buildInputs = with pkgs; [
    nodejs_20
    openssl
  ];
}