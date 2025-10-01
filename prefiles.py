#%%

from subprocess import Popen
import platform
import os
import shutil

homeDir = os.path.expanduser("~") + os.sep

print('Home directory:', homeDir)

# Create .urs_cookies and .dodsrc files
with open(homeDir + '.urs_cookies', 'w') as file:
    file.write('')
    file.close()
with open(homeDir + '.dodsrc', 'w') as file:
    file.write('HTTP.COOKIEJAR={}.urs_cookies\n'.format(homeDir))
    file.write('HTTP.NETRC={}_netrc'.format(homeDir))
    file.close()

print('Saved .urs_cookies and .dodsrc to:', homeDir)

# Copy dodsrc to working directory in Windows
if platform.system() == "Windows": 
    shutil.copy2(homeDir + '.dodsrc', os.getcwd())
    print('Copied .dodsrc to:', os.getcwd())

urs = 'urs.earthdata.nasa.gov'    # Earthdata URL to call for authentication

with open(homeDir + '.netrc', 'w') as file:
    file.write('machine {} login {} password {}'.format(urs, 'fata1i5m', 'Bruce12@07ss'))
    file.close()

with open(homeDir + '_netrc', 'w') as file:
    file.write('machine {} login {} password {}'.format(urs, 'fata1i5m', 'Bruce12@07ss'))
    file.close()

print('Saved .netrc to:', homeDir)
