import importlib.util, unittest
from pathlib import Path
import numpy as np
spec=importlib.util.spec_from_file_location('thermal',Path(__file__).with_name('09_thermal_observations.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ThermalTests(unittest.TestCase):
    def test_qc_and_fill(self):
        self.assertEqual(m.quality(np.array([15000,15000,15000,0]),np.array([0,1,64,0])).tolist(),[True,False,False,False])
    def test_scale_and_missing(self):
        p=m.summary(np.array([15000,16000]),np.array([0,64]),np.array([100,120]),np.array([True,True]),.02)
        self.assertEqual(p['kelvin'],[300,300,300])
        self.assertEqual(p['validFraction'],.5)
        self.assertEqual(p['solarHours'],[10,10])
        p=m.summary(np.array([0]),np.array([0]),np.array([255]),np.array([True]),.02)
        self.assertIsNone(p['kelvin'])
        self.assertIsNone(p['solarHours'])
if __name__=='__main__':unittest.main()
